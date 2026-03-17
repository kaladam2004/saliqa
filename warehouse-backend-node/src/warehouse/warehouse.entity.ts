import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('warehouses')
export class Warehouse extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  gps: string;

  @Column({ nullable: true })
  image: string;

  @Column({ name: 'responsible_person', nullable: true })
  responsiblePerson: string;

  @Column({ nullable: true })
  tel: string;

  @ManyToMany('Product', { eager: true, cascade: false })
  @JoinTable({
    name: 'warehouse_products',
    joinColumn: { name: 'warehouse_id' },
    inverseJoinColumn: { name: 'product_id' },
  })
  products: any[];
}
