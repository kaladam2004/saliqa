import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { UserInvoice } from '../user-invoice/user-invoice.entity';

@Entity('user_returns')
export class UserReturn extends BaseEntity {
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => UserInvoice, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_invoice_id' })
  userInvoice: UserInvoice;

  @Column()
  quantity: number;

  @Column({ type: 'timestamp', nullable: true })
  date: Date;

  @Column({ nullable: true })
  description: string;
}
