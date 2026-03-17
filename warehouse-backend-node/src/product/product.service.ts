import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Product } from './product.entity';
import { Batch } from './batch.entity';
import { ProductQtyTransaction } from './product-qty-transaction.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { Admin } from '../admin/admin.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class ProductDto {
  name: string;
  image?: string;
  description?: string;
  price: number;
  initialQuantity?: number;
  manufactureDate?: string;
  expireDate?: string;
  warehouseIds?: number[];
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Batch) private batchRepo: Repository<Batch>,
    @InjectRepository(ProductQtyTransaction) private txnRepo: Repository<ProductQtyTransaction>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const products = await this.productRepo.find({ where: { deleted: false }, relations: ['batches'] });
    return products.map(this.toResponse.bind(this));
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async createBatch(dtos: ProductDto[]) {
    const results = [];
    for (const dto of dtos) {
      const product = this.productRepo.create({
        name: dto.name,
        image: dto.image,
        description: dto.description,
        price: dto.price,
        quantity: 0,
      });
      const saved = await this.productRepo.save(product);

      const batchString = 'BATCH-' + uuidv4().substring(0, 8).toUpperCase();
      const batch = this.batchRepo.create({
        name: saved.name + ' Batch',
        batchString,
        manufactureDate: dto.manufactureDate || new Date().toISOString().split('T')[0],
        expireDate: dto.expireDate,
        product: saved,
      });
      await this.batchRepo.save(batch);

      if (dto.initialQuantity && dto.initialQuantity > 0) {
        saved.quantity = dto.initialQuantity;
        await this.productRepo.save(saved);
        const txn = this.txnRepo.create({
          product: saved,
          quantity: dto.initialQuantity,
          date: new Date().toISOString().split('T')[0],
          notes: 'Initial stock',
        });
        await this.txnRepo.save(txn);
      }

      if (dto.warehouseIds?.length) {
        for (const wId of dto.warehouseIds) {
          const warehouse = await this.warehouseRepo.findOne({ where: { id: wId, deleted: false }, relations: ['products'] });
          if (warehouse) {
            warehouse.products = [...(warehouse.products || []), saved];
            await this.warehouseRepo.save(warehouse);
          }
        }
      }

      await this.eventLogService.log(null, 'SYSTEM', 'system', EventType.CREATE, `Product created: ${saved.name}`, 'Product', saved.id);
      const fresh = await this.productRepo.findOne({ where: { id: saved.id }, relations: ['batches'] });
      results.push(this.toResponse(fresh));
    }
    return results;
  }

  async update(id: number, dto: ProductDto) {
    const product = await this.findById(id);
    product.name = dto.name;
    product.image = dto.image;
    product.description = dto.description;
    product.price = dto.price;
    return this.toResponse(await this.productRepo.save(product));
  }

  async delete(id: number) {
    const product = await this.findById(id);
    product.softDelete();
    await this.productRepo.save(product);
  }

  async addToWarehouse(warehouseId: number, productIds: number[]) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: warehouseId, deleted: false }, relations: ['products'],
    });
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', warehouseId);
    const products = await this.productRepo.findBy({ id: In(productIds), deleted: false });
    warehouse.products = [...(warehouse.products || []), ...products];
    await this.warehouseRepo.save(warehouse);
  }

  async addQuantity(id: number, qty: number, adminId: number, notes: string) {
    const product = await this.findById(id);
    product.quantity = (product.quantity || 0) + qty;
    await this.productRepo.save(product);

    const admin = adminId ? await this.adminRepo.findOne({ where: { id: adminId, deleted: false } }) : null;
    const txn = this.txnRepo.create({
      product,
      admin,
      quantity: qty,
      date: new Date().toISOString().split('T')[0],
      notes,
    });
    await this.txnRepo.save(txn);
    await this.eventLogService.log(
      adminId, 'ADMIN', admin?.username || 'system',
      EventType.STOCK_ADDED, `Added ${qty} units to product: ${product.name}`, 'Product', id,
    );
    return this.toResponse(product);
  }

  async findById(id: number): Promise<Product> {
    const p = await this.productRepo.findOne({ where: { id, deleted: false }, relations: ['batches'] });
    if (!p) throw new ResourceNotFoundException('Product', id);
    return p;
  }

  async findByIds(ids: number[]): Promise<Product[]> {
    return this.productRepo.findBy({ id: In(ids), deleted: false });
  }

  toResponse(p: Product) {
    return {
      id: p.id,
      name: p.name,
      image: p.image,
      quantity: p.quantity,
      description: p.description,
      price: p.price,
      batches: (p.batches || []).filter(b => !b.deleted).map(b => ({
        id: b.id, name: b.name, manufactureDate: b.manufactureDate,
        expireDate: b.expireDate, batchString: b.batchString,
        productId: p.id, createdAt: b.createdAt,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
