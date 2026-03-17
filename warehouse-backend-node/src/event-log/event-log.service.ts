import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLog } from './event-log.entity';
import { EventType } from '../common/enums/event-type.enum';
import { ActorType } from '../common/enums/actor-type.enum';

@Injectable()
export class EventLogService {
  constructor(
    @InjectRepository(EventLog) private repo: Repository<EventLog>,
  ) {}

  async log(
    actorId: number | null,
    actorType: ActorType | string,
    actorUsername: string,
    eventType: EventType,
    description: string,
    entityType?: string,
    entityId?: number,
  ) {
    const log = this.repo.create({
      actorId,
      actorType,
      actorUsername,
      eventType,
      description,
      entityType,
      entityId,
      timestamp: new Date(),
    });
    await this.repo.save(log);
  }

  async getAll() {
    return this.repo.find({ order: { timestamp: 'DESC' } });
  }
}
