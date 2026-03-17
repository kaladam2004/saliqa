import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { Admin } from '../admin/admin.entity';
import { User } from '../user/user.entity';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';

export class ExpenseDto {
  adminId?: number;
  userId?: number;
  description?: string;
  date?: string;
  total: number;
  category?: string;
}

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense) private repo: Repository<Expense>,
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getAll() {
    return this.repo.find({
      where: { deleted: false },
      relations: ['admin', 'user', 'approvedBy'],
      order: { createdAt: 'DESC' },
    }).then(es => es.map(this.toResponse.bind(this)));
  }

  async filter(userId?: number, from?: string, to?: string) {
    const qb = this.repo.createQueryBuilder('e')
      .leftJoinAndSelect('e.admin', 'admin')
      .leftJoinAndSelect('e.user', 'user')
      .leftJoinAndSelect('e.approvedBy', 'approvedBy')
      .where('e.deleted = false');
    if (userId) qb.andWhere('e.user_id = :userId', { userId });
    if (from) qb.andWhere('e.date >= :from', { from });
    if (to) qb.andWhere('e.date <= :to', { to });
    qb.orderBy('e.date', 'DESC');
    return (await qb.getMany()).map(this.toResponse.bind(this));
  }

  async getByAdmin(adminId: number) {
    return this.repo.find({
      where: { deleted: false },
      relations: ['admin', 'user', 'approvedBy'],
      order: { date: 'DESC' },
    }).then(es => es.filter(e => e.admin?.id === adminId).map(this.toResponse.bind(this)));
  }

  async getByUser(userId: number) {
    return this.repo.find({
      where: { deleted: false },
      relations: ['admin', 'user', 'approvedBy'],
      order: { date: 'DESC' },
    }).then(es => es.filter(e => e.user?.id === userId).map(this.toResponse.bind(this)));
  }

  async getPendingUser() {
    return this.repo.find({
      where: { approved: false, deleted: false },
      relations: ['admin', 'user', 'approvedBy'],
      order: { date: 'DESC' },
    }).then(es => es.filter(e => e.user != null).map(this.toResponse.bind(this)));
  }

  async create(dto: ExpenseDto) {
    const admin = dto.adminId
      ? await this.adminRepo.findOne({ where: { id: dto.adminId, deleted: false } })
      : null;
    const user = dto.userId
      ? await this.userRepo.findOne({ where: { id: dto.userId, deleted: false } })
      : null;
    const expense = this.repo.create({ ...dto, admin, user });
    return this.toResponse(await this.repo.save(expense));
  }

  async approve(id: number, adminId: number) {
    const expense = await this.repo.findOne({ where: { id, deleted: false }, relations: ['admin', 'user', 'approvedBy'] });
    if (!expense) throw new ResourceNotFoundException('Expense', id);
    const admin = await this.adminRepo.findOne({ where: { id: adminId, deleted: false } });
    if (!admin) throw new ResourceNotFoundException('Admin', adminId);
    expense.approved = true;
    expense.approvedBy = admin;
    expense.approvedAt = new Date();
    return this.toResponse(await this.repo.save(expense));
  }

  async delete(id: number) {
    const expense = await this.repo.findOne({ where: { id, deleted: false } });
    if (!expense) throw new ResourceNotFoundException('Expense', id);
    expense.softDelete();
    await this.repo.save(expense);
  }

  toResponse(e: Expense) {
    return {
      id: e.id,
      adminId: e.admin?.id || null,
      adminName: e.admin?.fullname || null,
      userId: e.user?.id || null,
      userName: e.user?.fullname || null,
      description: e.description,
      date: e.date,
      total: e.total,
      category: e.category,
      approved: e.approved,
      approvedByName: e.approvedBy?.fullname || null,
      approvedAt: e.approvedAt,
      createdAt: e.createdAt,
    };
  }
}
