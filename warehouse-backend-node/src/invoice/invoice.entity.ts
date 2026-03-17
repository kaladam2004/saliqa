import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from '../user/user.entity';
import { Shop } from '../shop/shop.entity';
import { InvoiceProduct } from './invoice-product.entity';
import { Payment } from '../payment/payment.entity';

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Index()
  @ManyToOne(() => Shop, { eager: true })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Index()
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, name: 'total_price' })
  totalPrice: number;

  @Column({ name: 'is_paid', default: false })
  paid: boolean;

  @Column({ name: 'is_free', default: false })
  free: boolean;

  @Column({ default: false })
  printed: boolean;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => InvoiceProduct, (ip) => ip.invoice, { eager: true, cascade: true })
  products: InvoiceProduct[];

  @OneToMany(() => Payment, (p) => p.invoice, { eager: true, cascade: true })
  payments: Payment[];
}
