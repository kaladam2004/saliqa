import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceProduct } from './invoice-product.entity';
import { Shop } from '../shop/shop.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { InsufficientStockException } from '../common/exceptions/insufficient-stock.exception';

export class InvoiceProductItem {
  productId: number;
  quantity: number;
  unitPrice?: number;
}

export class InvoiceDto {
  shopId: number;
  userId: number;
  date?: Date;
  free?: boolean;
  notes?: string;
  products: InvoiceProductItem[];
}

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceProduct) private ipRepo: Repository<InvoiceProduct>,
    @InjectRepository(Shop) private shopRepo: Repository<Shop>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const invoices = await this.invoiceRepo.find({
      where: { deleted: false },
      relations: ['shop', 'shop.shopkeeper', 'user', 'products', 'products.product', 'payments', 'payments.shop'],
      order: { createdAt: 'DESC' },
    });
    return invoices.map(this.toResponse.bind(this));
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async filter(shopId?: number, userId?: number, from?: Date, to?: Date) {
    const qb = this.invoiceRepo.createQueryBuilder('i')
      .leftJoinAndSelect('i.shop', 'shop')
      .leftJoinAndSelect('shop.shopkeeper', 'shopkeeper')
      .leftJoinAndSelect('i.user', 'user')
      .leftJoinAndSelect('i.products', 'products')
      .leftJoinAndSelect('products.product', 'product')
      .leftJoinAndSelect('i.payments', 'payments')
      .leftJoinAndSelect('payments.shop', 'payShop')
      .where('i.deleted = false');
    if (shopId) qb.andWhere('i.shop_id = :shopId', { shopId });
    if (userId) qb.andWhere('i.user_id = :userId', { userId });
    if (from) qb.andWhere('i.date >= :from', { from });
    if (to) qb.andWhere('i.date <= :to', { to });
    qb.orderBy('i.date', 'DESC');
    const invoices = await qb.getMany();
    return invoices.map(this.toResponse.bind(this));
  }

  async create(dto: InvoiceDto) {
    const shop = await this.shopRepo.findOne({ where: { id: dto.shopId, deleted: false }, relations: ['shopkeeper'] });
    if (!shop) throw new ResourceNotFoundException('Shop', dto.shopId);
    const user = await this.userRepo.findOne({ where: { id: dto.userId, deleted: false } });
    if (!user) throw new ResourceNotFoundException('User', dto.userId);

    const invoice = this.invoiceRepo.create({
      shop, user,
      date: dto.date ? new Date(dto.date) : new Date(),
      free: dto.free ?? false,
      notes: dto.notes,
      totalPrice: 0,
    });
    const saved = await this.invoiceRepo.save(invoice);

    let total = 0;
    for (const item of dto.products) {
      const product = await this.productRepo.findOne({ where: { id: item.productId, deleted: false } });
      if (!product) throw new ResourceNotFoundException('Product', item.productId);

      // Stock check: pickedUp - delivered - returned
      const pickedUp = await this.sumPickedUp(user.id, product.id);
      const delivered = await this.sumDelivered(user.id, product.id);
      const returned = await this.sumReturned(user.id, product.id);
      const available = pickedUp - delivered - returned;
      if (item.quantity > available) {
        throw new InsufficientStockException(product.name, item.quantity, available);
      }

      const unit = item.unitPrice ?? Number(product.price);
      const lineTotal = unit * item.quantity;
      total += lineTotal;

      const ip = this.ipRepo.create({
        invoice: saved, product,
        quantity: item.quantity,
        unitPrice: unit,
        totalPrice: lineTotal,
      });
      await this.ipRepo.save(ip);
    }

    await this.invoiceRepo.update(saved.id, { totalPrice: dto.free ? 0 : total });

    await this.eventLogService.log(user.id, 'USER', user.username, EventType.INVOICE_CREATED,
      `Invoice created for shop: ${shop.title}`, 'Invoice', saved.id);

    return this.toResponse(await this.findById(saved.id));
  }

  async update(id: number, dto: InvoiceDto) {
    const invoice = await this.findById(id);
    invoice.notes = dto.notes;
    invoice.free = dto.free ?? false;
    return this.toResponse(await this.invoiceRepo.save(invoice));
  }

  async delete(id: number) {
    const invoice = await this.findById(id);
    invoice.softDelete();
    await this.invoiceRepo.save(invoice);
  }

  async markPaid(id: number) {
    const invoice = await this.findById(id);
    invoice.paid = true;
    return this.toResponse(await this.invoiceRepo.save(invoice));
  }

  async markPrinted(id: number) {
    const invoice = await this.findById(id);
    invoice.printed = true;
    return this.toResponse(await this.invoiceRepo.save(invoice));
  }

  async sumDeliveredByUserAndProduct(userId: number, productId: number): Promise<number> {
    return this.sumDelivered(userId, productId);
  }

  private async sumPickedUp(userId: number, productId: number): Promise<number> {
    const result = await this.invoiceRepo.manager.query(
      `SELECT COALESCE(SUM(uip.quantity), 0) as total
       FROM user_invoice_products uip
       JOIN user_invoices ui ON ui.id = uip.user_invoice_id
       WHERE ui.user_id = $1 AND uip.product_id = $2
         AND ui.is_deleted = false AND uip.is_deleted = false`,
      [userId, productId],
    );
    return parseInt(result[0]?.total || '0');
  }

  private async sumDelivered(userId: number, productId: number): Promise<number> {
    const result = await this.invoiceRepo.manager.query(
      `SELECT COALESCE(SUM(ip.quantity), 0) as total
       FROM invoice_products ip
       JOIN invoices i ON i.id = ip.invoice_id
       WHERE i.user_id = $1 AND ip.product_id = $2
         AND i.is_deleted = false AND ip.is_deleted = false`,
      [userId, productId],
    );
    return parseInt(result[0]?.total || '0');
  }

  private async sumReturned(userId: number, productId: number): Promise<number> {
    const result = await this.invoiceRepo.manager.query(
      `SELECT COALESCE(SUM(quantity), 0) as total
       FROM user_returns
       WHERE user_id = $1 AND product_id = $2 AND is_deleted = false`,
      [userId, productId],
    );
    return parseInt(result[0]?.total || '0');
  }

  async findById(id: number): Promise<Invoice> {
    const inv = await this.invoiceRepo.findOne({
      where: { id, deleted: false },
      relations: ['shop', 'shop.shopkeeper', 'user', 'products', 'products.product', 'payments', 'payments.shop'],
    });
    if (!inv) throw new ResourceNotFoundException('Invoice', id);
    return inv;
  }

  toResponse(i: Invoice) {
    return {
      id: i.id,
      shop: i.shop ? {
        id: i.shop.id, title: i.shop.title, description: i.shop.description,
        gps: i.shop.gps, image: i.shop.image, tel: i.shop.tel,
        shopkeeper: i.shop.shopkeeper ? { id: i.shop.shopkeeper.id, fullname: i.shop.shopkeeper.fullname } : null,
        test: i.shop.test,
      } : null,
      user: i.user ? {
        id: i.user.id, fullname: i.user.fullname, username: i.user.username, tel: i.user.tel,
      } : null,
      date: i.date,
      totalPrice: i.totalPrice,
      paid: i.paid,
      free: i.free,
      printed: i.printed,
      notes: i.notes,
      products: (i.products || []).filter(ip => !ip.deleted).map(ip => ({
        id: ip.id, productId: ip.product?.id, productName: ip.product?.name,
        quantity: ip.quantity, unitPrice: ip.unitPrice, totalPrice: ip.totalPrice,
      })),
      payments: (i.payments || []).filter(p => !p.deleted).map(p => ({
        id: p.id, invoiceId: i.id, shopId: p.shop?.id, shopTitle: p.shop?.title,
        amount: p.amount, paymentMethod: p.paymentMethod,
        description: p.description, paidAt: p.paidAt, createdAt: p.createdAt, change: 0,
      })),
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }
}
