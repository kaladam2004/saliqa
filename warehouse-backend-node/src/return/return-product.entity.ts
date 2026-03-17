import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Return } from './return.entity';
import { Product } from '../product/product.entity';

@Entity('return_products')
export class ReturnProduct extends BaseEntity {
  @ManyToOne(() => Return, (r) => r.products)
  @JoinColumn({ name: 'return_id' })
  aReturn: Return;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  quantity: number;
}
