import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from '../user/user.entity';
import { Shop } from '../shop/shop.entity';
import { Invoice } from '../invoice/invoice.entity';
import { ReturnProduct } from './return-product.entity';

@Entity('returns')
export class Return extends BaseEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Shop, { eager: true })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @ManyToOne(() => Invoice, { nullable: true, eager: false })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'timestamp', nullable: true })
  date: Date;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => ReturnProduct, (rp) => rp.aReturn, { eager: true, cascade: true })
  products: ReturnProduct[];
}
