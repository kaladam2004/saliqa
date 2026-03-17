import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column()
  fullname: string;

  @Column({ nullable: true })
  tel: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  gps: string;
}
