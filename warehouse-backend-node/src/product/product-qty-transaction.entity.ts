import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Product } from './product.entity';
import { Admin } from '../admin/admin.entity';

@Entity('product_qty_transactions')
export class ProductQtyTransaction extends BaseEntity {
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column()
  quantity: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  notes: string;
}
