import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Batch } from './batch.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: 0 })
  quantity: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @OneToMany(() => Batch, (b) => b.product, { eager: true, cascade: true })
  batches: Batch[];
}
