import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from '../user/user.entity';

@Entity('shops')
export class Shop extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  gps: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  tel: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'shopkeeper_id' })
  shopkeeper: User;

  @Column({ name: 'is_test', default: false })
  test: boolean;
}
