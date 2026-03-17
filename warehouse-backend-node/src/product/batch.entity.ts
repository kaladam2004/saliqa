import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('batches')
export class Batch extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'batch_string', nullable: true })
  batchString: string;

  @Column({ name: 'manufacture_date', type: 'date', nullable: true })
  manufactureDate: string;

  @Column({ name: 'expire_date', type: 'date', nullable: true })
  expireDate: string;

  @ManyToOne(() => Product, (p) => p.batches)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
