import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './shop.entity';
import { User } from '../user/user.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class ShopDto {
  title: string;
  description?: string;
  gps?: string;
  image?: string;
  tel?: string;
  shopkeeperId?: number;
  test?: boolean;
}

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop) private repo: Repository<Shop>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const shops = await this.repo.find({ where: { deleted: false }, relations: ['shopkeeper'] });
    return shops.map(this.toResponse.bind(this));
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async create(dto: ShopDto) {
    let shopkeeper: User = null;
    if (dto.shopkeeperId) {
      shopkeeper = await this.userRepo.findOne({ where: { id: dto.shopkeeperId, deleted: false } });
      if (!shopkeeper) throw new ResourceNotFoundException('User', dto.shopkeeperId);
    }
    const shop = this.repo.create({ ...dto, shopkeeper });
    const saved = await this.repo.save(shop);
    await this.eventLogService.log(null, 'SYSTEM', 'system', EventType.CREATE, `Shop created: ${saved.title}`, 'Shop', saved.id);
    return this.toResponse(saved);
  }

  async update(id: number, dto: ShopDto) {
    const shop = await this.findById(id);
    let shopkeeper: User = null;
    if (dto.shopkeeperId) {
      shopkeeper = await this.userRepo.findOne({ where: { id: dto.shopkeeperId, deleted: false } });
      if (!shopkeeper) throw new ResourceNotFoundException('User', dto.shopkeeperId);
    }
    shop.title = dto.title;
    shop.description = dto.description;
    shop.gps = dto.gps;
    shop.image = dto.image;
    shop.tel = dto.tel;
    shop.shopkeeper = shopkeeper;
    shop.test = dto.test ?? false;
    return this.toResponse(await this.repo.save(shop));
  }

  async delete(id: number) {
    const shop = await this.findById(id);
    shop.softDelete();
    await this.repo.save(shop);
  }

  async findById(id: number): Promise<Shop> {
    const shop = await this.repo.findOne({ where: { id, deleted: false }, relations: ['shopkeeper'] });
    if (!shop) throw new ResourceNotFoundException('Shop', id);
    return shop;
  }

  toResponse(s: Shop) {
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      gps: s.gps,
      image: s.image,
      tel: s.tel,
      shopkeeper: s.shopkeeper ? {
        id: s.shopkeeper.id, fullname: s.shopkeeper.fullname,
        username: s.shopkeeper.username, tel: s.shopkeeper.tel,
      } : null,
      test: s.test,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
