import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class WarehouseDto {
  title: string;
  description?: string;
  gps?: string;
  image?: string;
  responsiblePerson?: string;
  tel?: string;
}

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse) private repo: Repository<Warehouse>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const warehouses = await this.repo.find({ where: { deleted: false }, relations: ['products'] });
    return warehouses.map(this.toResponse.bind(this));
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async create(dto: WarehouseDto) {
    const w = this.repo.create(dto);
    const saved = await this.repo.save(w);
    await this.eventLogService.log(null, 'SYSTEM', 'system', EventType.CREATE, `Warehouse created: ${saved.title}`, 'Warehouse', saved.id);
    return this.toResponse(saved);
  }

  async update(id: number, dto: WarehouseDto) {
    const w = await this.findById(id);
    Object.assign(w, dto);
    return this.toResponse(await this.repo.save(w));
  }

  async delete(id: number) {
    const w = await this.findById(id);
    w.softDelete();
    await this.repo.save(w);
  }

  async findById(id: number): Promise<Warehouse> {
    const w = await this.repo.findOne({ where: { id, deleted: false }, relations: ['products'] });
    if (!w) throw new ResourceNotFoundException('Warehouse', id);
    return w;
  }

  toResponse(w: Warehouse) {
    return {
      id: w.id,
      title: w.title,
      description: w.description,
      gps: w.gps,
      image: w.image,
      responsiblePerson: w.responsiblePerson,
      tel: w.tel,
      products: (w.products || []).filter(p => !p.deleted).map(p => ({
        id: p.id, name: p.name, image: p.image, quantity: p.quantity,
        description: p.description, price: p.price, createdAt: p.createdAt,
      })),
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }
}
