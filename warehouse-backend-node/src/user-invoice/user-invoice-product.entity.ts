import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { UserInvoice } from './user-invoice.entity';
import { Product } from '../product/product.entity';

@Entity('user_invoice_products')
export class UserInvoiceProduct extends BaseEntity {
  @Index()
  @ManyToOne(() => UserInvoice, (ui) => ui.products)
  @JoinColumn({ name: 'user_invoice_id' })
  userInvoice: UserInvoice;

  @Index()
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'unit_price' })
  unitPrice: number;
}
