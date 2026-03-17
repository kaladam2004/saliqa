import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class UserDto {
  fullname: string;
  tel?: string;
  username: string;
  password?: string;
  description?: string;
  photo?: string;
  address?: string;
  gps?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const users = await this.userRepo.find({ where: { deleted: false } });
    return users.map(this.toResponse);
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async create(dto: UserDto) {
    const exists = await this.userRepo.findOne({ where: { username: dto.username, deleted: false } });
    if (exists) throw new ConflictException(`Username already exists: ${dto.username}`);
    const user = this.userRepo.create({ ...dto, password: await bcrypt.hash(dto.password, 10) });
    const saved = await this.userRepo.save(user);
    await this.eventLogService.log(saved.id, 'USER', saved.username, EventType.CREATE, `User created: ${saved.username}`, 'User', saved.id);
    return this.toResponse(saved);
  }

  async update(id: number, dto: UserDto) {
    const user = await this.findById(id);
    if (user.username !== dto.username) {
      const exists = await this.userRepo.findOne({ where: { username: dto.username, deleted: false } });
      if (exists) throw new ConflictException(`Username already exists: ${dto.username}`);
    }
    user.fullname = dto.fullname;
    user.tel = dto.tel;
    user.username = dto.username;
    if (dto.password) user.password = await bcrypt.hash(dto.password, 10);
    user.description = dto.description;
    user.photo = dto.photo;
    user.address = dto.address;
    user.gps = dto.gps;
    return this.toResponse(await this.userRepo.save(user));
  }

  async delete(id: number) {
    const user = await this.findById(id);
    user.softDelete();
    await this.userRepo.save(user);
    await this.eventLogService.log(id, 'USER', user.username, EventType.DELETE, `User deleted: ${user.username}`, 'User', id);
  }

  async updateGps(id: number, gps: string) {
    const user = await this.findById(id);
    user.gps = gps;
    return this.toResponse(await this.userRepo.save(user));
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, deleted: false } });
    if (!user) throw new ResourceNotFoundException('User', id);
    return user;
  }

  toResponse(u: User) {
    return {
      id: u.id,
      fullname: u.fullname,
      tel: u.tel,
      username: u.username,
      description: u.description,
      photo: u.photo,
      address: u.address,
      gps: u.gps,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }
}
