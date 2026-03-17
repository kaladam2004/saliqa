import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Admin } from '../admin/admin.entity';
import { User } from '../user/user.entity';

@Entity('expenses')
export class Expense extends BaseEntity {
  @ManyToOne(() => Admin, { nullable: true, eager: true })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  date: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ nullable: true })
  category: string;

  @Column({ default: false })
  approved: boolean;

  @ManyToOne(() => Admin, { nullable: true, eager: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: Admin;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;
}
