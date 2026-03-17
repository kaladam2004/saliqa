import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { EventType } from '../common/enums/event-type.enum';

@Entity('event_logs')
export class EventLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'actor_id', nullable: true })
  actorId: number;

  @Column({ name: 'actor_type', nullable: true })
  actorType: string;

  @Column({ name: 'actor_username', nullable: true })
  actorUsername: string;

  @Column({ type: 'varchar', name: 'event_type' })
  eventType: EventType;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'entity_type', nullable: true })
  entityType: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId: number;

  @CreateDateColumn()
  timestamp: Date;
}
