import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReturn } from './user-return.entity';
import { Product } from '../product/product.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { User } from '../user/user.entity';
import { UserInvoice } from '../user-invoice/user-invoice.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class UserReturnDto {
  productId: number;
  warehouseId: number;
  userId: number;
  userInvoiceId?: number;
  quantity: number;
  date?: Date;
  description?: string;
}

@Injectable()
export class UserReturnService {
  constructor(
    @InjectRepository(UserReturn) private urRepo: Repository<UserReturn>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserInvoice) private uiRepo: Repository<UserInvoice>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    return this.urRepo.find({
      where: { deleted: false },
      relations: ['product', 'warehouse', 'user', 'userInvoice'],
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: number) {
    return this.findById(id);
  }

  async create(dto: UserReturnDto) {
    const product = await this.productRepo.findOne({ where: { id: dto.productId, deleted: false } });
    if (!product) throw new ResourceNotFoundException('Product', dto.productId);
    const warehouse = await this.warehouseRepo.findOne({ where: { id: dto.warehouseId, deleted: false } });
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', dto.warehouseId);
    const user = await this.userRepo.findOne({ where: { id: dto.userId, deleted: false } });
    if (!user) throw new ResourceNotFoundException('User', dto.userId);

    let userInvoice: UserInvoice = null;
    if (dto.userInvoiceId) {
      userInvoice = await this.uiRepo.findOne({ where: { id: dto.userInvoiceId, deleted: false } });
    }

    const ret = this.urRepo.create({
      product, warehouse, user, userInvoice,
      quantity: dto.quantity,
      date: dto.date ? new Date(dto.date) : new Date(),
      description: dto.description,
    });
    const saved = await this.urRepo.save(ret);

    product.quantity += dto.quantity;
    await this.productRepo.save(product);

    await this.eventLogService.log(user.id, 'USER', user.username, EventType.USER_RETURN_CREATED,
      `User return created: ${dto.quantity} units of ${product.name}`, 'UserReturn', saved.id);

    return this.toResponse(saved);
  }

  async delete(id: number) {
    const ret = await this.findById(id);
    ret.softDelete();
    await this.urRepo.save(ret);
  }

  private async findById(id: number): Promise<UserReturn> {
    const r = await this.urRepo.findOne({
      where: { id, deleted: false },
      relations: ['product', 'warehouse', 'user', 'userInvoice'],
    });
    if (!r) throw new ResourceNotFoundException('UserReturn', id);
    return r;
  }

  toResponse(r: UserReturn) {
    return {
      id: r.id,
      productId: r.product?.id,
      productName: r.product?.name,
      warehouseId: r.warehouse?.id,
      warehouseTitle: r.warehouse?.title,
      user: r.user ? { id: r.user.id, fullname: r.user.fullname, username: r.user.username } : null,
      userInvoiceId: r.userInvoice?.id || null,
      quantity: r.quantity,
      date: r.date,
      description: r.description,
      createdAt: r.createdAt,
    };
  }
}
