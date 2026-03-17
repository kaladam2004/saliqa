import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Batch } from '../product/batch.entity';
import { Product } from '../product/product.entity';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class BatchDto {
  name: string;
  manufactureDate?: string;
  expireDate?: string;
  batchString?: string;
  productId: number;
}

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(Batch) private batchRepo: Repository<Batch>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async getAll() {
    return this.batchRepo.find({ where: { deleted: false }, relations: ['product'] });
  }

  async getById(id: number) {
    const b = await this.batchRepo.findOne({ where: { id, deleted: false }, relations: ['product'] });
    if (!b) throw new ResourceNotFoundException('Batch', id);
    return b;
  }

  async create(dto: BatchDto) {
    const product = await this.productRepo.findOne({ where: { id: dto.productId, deleted: false } });
    if (!product) throw new ResourceNotFoundException('Product', dto.productId);
    const batch = this.batchRepo.create({ ...dto, product });
    return this.batchRepo.save(batch);
  }

  async update(id: number, dto: BatchDto) {
    const batch = await this.getById(id);
    batch.name = dto.name;
    batch.manufactureDate = dto.manufactureDate;
    batch.expireDate = dto.expireDate;
    batch.batchString = dto.batchString;
    return this.batchRepo.save(batch);
  }

  async delete(id: number) {
    const batch = await this.getById(id);
    batch.softDelete();
    await this.batchRepo.save(batch);
  }
}
