import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Return } from './return.entity';
import { ReturnProduct } from './return-product.entity';
import { User } from '../user/user.entity';
import { Shop } from '../shop/shop.entity';
import { Invoice } from '../invoice/invoice.entity';
import { Product } from '../product/product.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class ReturnProductItem {
  productId: number;
  quantity: number;
}

export class ReturnDto {
  userId: number;
  shopId: number;
  invoiceId?: number;
  date?: Date;
  description?: string;
  products: ReturnProductItem[];
}

@Injectable()
export class ReturnService {
  constructor(
    @InjectRepository(Return) private returnRepo: Repository<Return>,
    @InjectRepository(ReturnProduct) private rpRepo: Repository<ReturnProduct>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Shop) private shopRepo: Repository<Shop>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const returns = await this.returnRepo.find({
      where: { deleted: false },
      relations: ['user', 'shop', 'products', 'products.product'],
      order: { createdAt: 'DESC' },
    });
    return returns.map(this.toResponse.bind(this));
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async create(dto: ReturnDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId, deleted: false } });
    if (!user) throw new ResourceNotFoundException('User', dto.userId);
    const shop = await this.shopRepo.findOne({ where: { id: dto.shopId, deleted: false } });
    if (!shop) throw new ResourceNotFoundException('Shop', dto.shopId);

    let invoice: Invoice = null;
    if (dto.invoiceId) {
      invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId, deleted: false } });
    }

    const ret = this.returnRepo.create({
      user, shop, invoice,
      date: dto.date ? new Date(dto.date) : new Date(),
      description: dto.description,
      products: [],
    });
    const saved = await this.returnRepo.save(ret);

    for (const item of dto.products) {
      const product = await this.productRepo.findOne({ where: { id: item.productId, deleted: false } });
      if (!product) throw new ResourceNotFoundException('Product', item.productId);
      const rp = this.rpRepo.create({ aReturn: saved, product, quantity: item.quantity });
      await this.rpRepo.save(rp);
      product.quantity += item.quantity;
      await this.productRepo.save(product);
    }

    await this.returnRepo.save(saved);
    await this.eventLogService.log(user.id, 'USER', user.username, EventType.PRODUCT_RETURNED,
      `Return created for shop: ${shop.title}`, 'Return', saved.id);
    return this.toResponse(await this.findById(saved.id));
  }

  async delete(id: number) {
    const ret = await this.findById(id);
    ret.softDelete();
    await this.returnRepo.save(ret);
  }

  private async findById(id: number): Promise<Return> {
    const r = await this.returnRepo.findOne({
      where: { id, deleted: false },
      relations: ['user', 'shop', 'products', 'products.product'],
    });
    if (!r) throw new ResourceNotFoundException('Return', id);
    return r;
  }

  toResponse(r: Return) {
    return {
      id: r.id,
      user: r.user ? { id: r.user.id, fullname: r.user.fullname, username: r.user.username } : null,
      shop: r.shop ? { id: r.shop.id, title: r.shop.title } : null,
      invoiceId: r.invoice?.id || null,
      date: r.date,
      description: r.description,
      products: (r.products || []).filter(rp => !rp.deleted).map(rp => ({
        productId: rp.product?.id, productName: rp.product?.name, quantity: rp.quantity,
      })),
      createdAt: r.createdAt,
    };
  }
}
