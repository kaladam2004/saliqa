import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserInvoice } from './user-invoice.entity';
import { UserInvoiceProduct } from './user-invoice-product.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { InsufficientStockException } from '../common/exceptions/insufficient-stock.exception';

export class UserInvoiceProductItem {
  productId: number;
  quantity: number;
  unitPrice?: number;
}

export class UserInvoiceDto {
  warehouseId: number;
  userId: number;
  date?: Date;
  notes?: string;
  products: UserInvoiceProductItem[];
}

@Injectable()
export class UserInvoiceService {
  constructor(
    @InjectRepository(UserInvoice) private uiRepo: Repository<UserInvoice>,
    @InjectRepository(UserInvoiceProduct) private uipRepo: Repository<UserInvoiceProduct>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const invoices = await this.uiRepo.find({
      where: { deleted: false },
      relations: ['warehouse', 'user', 'products', 'products.product', 'payments'],
      order: { createdAt: 'DESC' },
    });
    return invoices.map(this.toResponse.bind(this));
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async filter(userId?: number, warehouseId?: number, from?: Date, to?: Date) {
    const qb = this.uiRepo.createQueryBuilder('ui')
      .leftJoinAndSelect('ui.warehouse', 'warehouse')
      .leftJoinAndSelect('ui.user', 'user')
      .leftJoinAndSelect('ui.products', 'products')
      .leftJoinAndSelect('products.product', 'product')
      .leftJoinAndSelect('ui.payments', 'payments')
      .where('ui.deleted = false');
    if (userId) qb.andWhere('ui.user_id = :userId', { userId });
    if (warehouseId) qb.andWhere('ui.warehouse_id = :warehouseId', { warehouseId });
    if (from) qb.andWhere('ui.date >= :from', { from });
    if (to) qb.andWhere('ui.date <= :to', { to });
    qb.orderBy('ui.date', 'DESC');
    const invoices = await qb.getMany();
    return invoices.map(this.toResponse.bind(this));
  }

  async create(dto: UserInvoiceDto) {
    const warehouse = await this.warehouseRepo.findOne({ where: { id: dto.warehouseId, deleted: false } });
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', dto.warehouseId);
    const user = await this.userRepo.findOne({ where: { id: dto.userId, deleted: false } });
    if (!user) throw new ResourceNotFoundException('User', dto.userId);

    const invoice = this.uiRepo.create({
      warehouse, user,
      date: dto.date ? new Date(dto.date) : new Date(),
      notes: dto.notes,
      totalPrice: 0,
    });
    const saved = await this.uiRepo.save(invoice);

    let total = 0;
    for (const item of dto.products) {
      const product = await this.productRepo.findOne({ where: { id: item.productId, deleted: false } });
      if (!product) throw new ResourceNotFoundException('Product', item.productId);

      if (product.quantity < item.quantity) {
        throw new InsufficientStockException(product.name, item.quantity, product.quantity);
      }

      const unit = item.unitPrice ?? Number(product.price);
      total += unit * item.quantity;

      const uip = this.uipRepo.create({
        userInvoice: saved, product,
        quantity: item.quantity,
        unitPrice: unit,
      });
      await this.uipRepo.save(uip);

      product.quantity -= item.quantity;
      await this.productRepo.save(product);
    }

    await this.uiRepo.update(saved.id, { totalPrice: total });

    await this.eventLogService.log(user.id, 'USER', user.username, EventType.USER_INVOICE_CREATED,
      `User invoice created from warehouse: ${warehouse.title}`, 'UserInvoice', saved.id);

    return this.toResponse(await this.findById(saved.id));
  }

  async delete(id: number) {
    const invoice = await this.findById(id);
    invoice.softDelete();
    await this.uiRepo.save(invoice);
  }

  async markPaid(id: number) {
    const invoice = await this.findById(id);
    invoice.paid = true;
    return this.toResponse(await this.uiRepo.save(invoice));
  }

  async markPrinted(id: number) {
    const invoice = await this.findById(id);
    invoice.printed = true;
    return this.toResponse(await this.uiRepo.save(invoice));
  }

  async getUnpaidByUser(userId: number) {
    const invoices = await this.uiRepo.find({
      where: { paid: false, deleted: false, user: { id: userId } },
      relations: ['warehouse', 'user', 'products', 'products.product', 'payments'],
    });
    return invoices.map(this.toResponse.bind(this));
  }

  async getRepStock(userId: number): Promise<Map<number, number>> {
    const pickedUp = await this.uiRepo.manager.query(
      `SELECT uip.product_id, SUM(uip.quantity) as total
       FROM user_invoice_products uip
       JOIN user_invoices ui ON ui.id = uip.user_invoice_id
       WHERE ui.user_id = $1 AND ui.is_deleted = false AND uip.is_deleted = false
       GROUP BY uip.product_id`,
      [userId],
    );
    const delivered = await this.uiRepo.manager.query(
      `SELECT ip.product_id, SUM(ip.quantity) as total
       FROM invoice_products ip
       JOIN invoices i ON i.id = ip.invoice_id
       WHERE i.user_id = $1 AND i.is_deleted = false AND ip.is_deleted = false
       GROUP BY ip.product_id`,
      [userId],
    );
    const returned = await this.uiRepo.manager.query(
      `SELECT product_id, SUM(quantity) as total
       FROM user_returns
       WHERE user_id = $1 AND is_deleted = false
       GROUP BY product_id`,
      [userId],
    );

    const pickedMap = new Map<number, number>(pickedUp.map(r => [parseInt(r.product_id), parseInt(r.total)]));
    const deliveredMap = new Map<number, number>(delivered.map(r => [parseInt(r.product_id), parseInt(r.total)]));
    const returnedMap = new Map<number, number>(returned.map(r => [parseInt(r.product_id), parseInt(r.total)]));

    const available = new Map<number, number>();
    for (const [productId, qty] of pickedMap) {
      const avail = qty - (deliveredMap.get(productId) || 0) - (returnedMap.get(productId) || 0);
      if (avail > 0) available.set(productId, avail);
    }
    return available;
  }

  async getRepProducts(userId: number, search?: string, page = 0, size = 20) {
    const stock = await this.getRepStock(userId);
    if (stock.size === 0) return { content: [], totalElements: 0, page, size };

    const productIds = Array.from(stock.keys());
    const products = await this.productRepo.findBy({ id: In(productIds), deleted: false });

    let filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const total = filtered.length;
    const start = page * size;
    const pageContent = filtered.slice(start, start + size).map(p => ({
      id: p.id, name: p.name, image: p.image,
      quantity: stock.get(p.id), description: p.description, price: p.price,
    }));

    return { content: pageContent, totalElements: total, page, size };
  }

  async findById(id: number): Promise<UserInvoice> {
    const inv = await this.uiRepo.findOne({
      where: { id, deleted: false },
      relations: ['warehouse', 'user', 'products', 'products.product', 'payments'],
    });
    if (!inv) throw new ResourceNotFoundException('UserInvoice', id);
    return inv;
  }

  toResponse(ui: UserInvoice) {
    return {
      id: ui.id,
      warehouse: ui.warehouse ? {
        id: ui.warehouse.id, title: ui.warehouse.title, description: ui.warehouse.description,
      } : null,
      user: ui.user ? {
        id: ui.user.id, fullname: ui.user.fullname, username: ui.user.username,
      } : null,
      date: ui.date,
      totalPrice: ui.totalPrice,
      paid: ui.paid,
      printed: ui.printed,
      notes: ui.notes,
      products: (ui.products || []).filter(p => !p.deleted).map(p => ({
        productId: p.product?.id, productName: p.product?.name,
        quantity: p.quantity, unitPrice: p.unitPrice,
      })),
      payments: (ui.payments || []).filter(p => !p.deleted).map(p => ({
        id: p.id, amount: p.amount,
        paymentMethod: p.paymentMethod, date: p.date,
      })),
      createdAt: ui.createdAt,
    };
  }
}
