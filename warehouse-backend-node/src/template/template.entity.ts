import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string;

  @Column({ nullable: true })
  value: string;
}
