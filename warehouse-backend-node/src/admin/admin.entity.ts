import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { AdminRole } from '../common/enums/admin-role.enum';

@Entity('admins')
export class Admin extends BaseEntity {
  @Column({ nullable: true })
  fullname: string;

  @Column({ nullable: true })
  tel: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', default: AdminRole.ADMIN })
  role: AdminRole;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany('Warehouse', { eager: false })
  @JoinTable({
    name: 'admin_warehouses',
    joinColumn: { name: 'admin_id' },
    inverseJoinColumn: { name: 'warehouse_id' },
  })
  warehouses: any[];
}
