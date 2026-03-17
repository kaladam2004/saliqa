import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Invoice } from '../invoice/invoice.entity';
import { Shop } from '../shop/shop.entity';
import { PaymentMethod } from '../common/enums/payment-method.enum';

@Entity('payments')
export class Payment extends BaseEntity {
  @Index()
  @ManyToOne(() => Invoice, (i) => i.payments)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @ManyToOne(() => Shop, { eager: true })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;
}
