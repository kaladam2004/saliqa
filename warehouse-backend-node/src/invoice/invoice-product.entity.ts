import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Invoice } from './invoice.entity';
import { Product } from '../product/product.entity';

@Entity('invoice_products')
export class InvoiceProduct extends BaseEntity {
  @Index()
  @ManyToOne(() => Invoice, (i) => i.products)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Index()
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_price' })
  totalPrice: number;
}
