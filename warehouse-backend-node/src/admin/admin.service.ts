import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Admin } from './admin.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { AdminRole } from '../common/enums/admin-role.enum';

export class AdminDto {
  fullname: string;
  tel?: string;
  username: string;
  password?: string;
  role: AdminRole;
  photo?: string;
  description?: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const admins = await this.adminRepo.find({ where: { deleted: false } });
    return admins.map(this.toResponse);
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async create(dto: AdminDto) {
    const exists = await this.adminRepo.findOne({ where: { username: dto.username, deleted: false } });
    if (exists) throw new ConflictException(`Username already exists: ${dto.username}`);
    const admin = this.adminRepo.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
    });
    const saved = await this.adminRepo.save(admin);
    await this.eventLogService.log(saved.id, 'ADMIN', saved.username, EventType.CREATE, `Admin created: ${saved.username}`, 'Admin', saved.id);
    return this.toResponse(saved);
  }

  async update(id: number, dto: AdminDto) {
    const admin = await this.findById(id);
    if (admin.username !== dto.username) {
      const exists = await this.adminRepo.findOne({ where: { username: dto.username, deleted: false } });
      if (exists) throw new ConflictException(`Username already exists: ${dto.username}`);
    }
    admin.fullname = dto.fullname;
    admin.tel = dto.tel;
    admin.username = dto.username;
    if (dto.password) admin.password = await bcrypt.hash(dto.password, 10);
    admin.role = dto.role;
    admin.photo = dto.photo;
    admin.description = dto.description;
    return this.toResponse(await this.adminRepo.save(admin));
  }

  async delete(id: number) {
    const admin = await this.findById(id);
    admin.softDelete();
    await this.adminRepo.save(admin);
    await this.eventLogService.log(id, 'ADMIN', admin.username, EventType.DELETE, `Admin deleted: ${admin.username}`, 'Admin', id);
  }

  async assignWarehouses(adminId: number, warehouseIds: number[]) {
    const admin = await this.findById(adminId);
    const warehouses = await this.warehouseRepo.findBy({ id: In(warehouseIds) });
    admin.warehouses = warehouses;
    await this.adminRepo.save(admin);
  }

  private async findById(id: number): Promise<Admin> {
    const admin = await this.adminRepo.findOne({ where: { id, deleted: false } });
    if (!admin) throw new ResourceNotFoundException('Admin', id);
    return admin;
  }

  toResponse(a: Admin) {
    return {
      id: a.id,
      fullname: a.fullname,
      tel: a.tel,
      username: a.username,
      role: a.role,
      photo: a.photo,
      description: a.description,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}
