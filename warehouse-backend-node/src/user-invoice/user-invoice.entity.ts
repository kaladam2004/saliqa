import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from '../user/user.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { UserInvoiceProduct } from './user-invoice-product.entity';
import { UserPayment } from '../user-payment/user-payment.entity';

@Entity('user_invoices')
export class UserInvoice extends BaseEntity {
  @Index()
  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

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

  @Column({ default: false })
  printed: boolean;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => UserInvoiceProduct, (p) => p.userInvoice, { eager: true, cascade: true })
  products: UserInvoiceProduct[];

  @OneToMany(() => UserPayment, (p) => p.userInvoice, { eager: true, cascade: false })
  payments: UserPayment[];
}
