import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from '../user/user.entity';
import { UserInvoice } from '../user-invoice/user-invoice.entity';
import { PaymentMethod } from '../common/enums/payment-method.enum';

@Entity('user_payments')
export class UserPayment extends BaseEntity {
  @Index()
  @ManyToOne(() => UserInvoice, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_invoice_id' })
  userInvoice: UserInvoice;

  @Index()
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'varchar', name: 'payment_method' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'timestamp', nullable: true })
  date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ default: false })
  accepted: boolean;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;
}
