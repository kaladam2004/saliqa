import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPayment } from './user-payment.entity';
import { UserInvoice } from '../user-invoice/user-invoice.entity';
import { User } from '../user/user.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { PaymentMethod } from '../common/enums/payment-method.enum';

export class UserPaymentDto {
  userInvoiceId?: number;
  userId: number;
  description?: string;
  paymentMethod: PaymentMethod;
  date?: Date;
  amount: number;
}

export class BulkUserPaymentDto {
  userId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  date?: Date;
}

@Injectable()
export class UserPaymentService {
  constructor(
    @InjectRepository(UserPayment) private upRepo: Repository<UserPayment>,
    @InjectRepository(UserInvoice) private uiRepo: Repository<UserInvoice>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    return this.upRepo.find({
      where: { deleted: false },
      relations: ['user', 'userInvoice'],
      order: { createdAt: 'DESC' },
    });
  }

  async getById(id: number) {
    return this.findById(id);
  }

  async getByUser(userId: number) {
    return this.upRepo.find({
      where: { deleted: false },
      relations: ['user', 'userInvoice'],
    }).then(ps => ps.filter(p => p.user?.id === userId));
  }

  async getPending() {
    return this.upRepo.find({
      where: { accepted: false, deleted: false },
      relations: ['user', 'userInvoice'],
    });
  }

  async create(dto: UserPaymentDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId, deleted: false } });
    if (!user) throw new ResourceNotFoundException('User', dto.userId);

    let userInvoice: UserInvoice = null;
    let change = 0;
    let actualAmount = dto.amount;

    if (dto.userInvoiceId) {
      userInvoice = await this.uiRepo.findOne({ where: { id: dto.userInvoiceId, deleted: false } });
      if (userInvoice) {
        const alreadyPaid = await this.sumByUserInvoice(userInvoice.id);
        const remaining = Math.max(0, Number(userInvoice.totalPrice) - alreadyPaid);
        actualAmount = dto.amount > remaining ? remaining : dto.amount;
        change = dto.amount - actualAmount;
      }
    }

    const payment = this.upRepo.create({
      userInvoice, user,
      description: dto.description,
      paymentMethod: dto.paymentMethod,
      date: dto.date ? new Date(dto.date) : new Date(),
      amount: actualAmount,
    });
    const saved = await this.upRepo.save(payment);

    await this.eventLogService.log(user.id, 'USER', user.username, EventType.USER_PAYMENT_SUBMITTED,
      `User payment submitted: ${actualAmount}`, 'UserPayment', saved.id);

    if (userInvoice) {
      const totalPaid = await this.sumByUserInvoice(userInvoice.id);
      if (totalPaid >= Number(userInvoice.totalPrice)) {
        userInvoice.paid = true;
        await this.uiRepo.save(userInvoice);
      }
    }

    return { ...saved, change };
  }

  async bulkPay(dto: BulkUserPaymentDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId, deleted: false } });
    if (!user) throw new ResourceNotFoundException('User', dto.userId);

    const unpaidInvoices = await this.uiRepo.find({
      where: { paid: false, deleted: false },
      order: { date: 'ASC' },
    });
    const userInvoices = unpaidInvoices.filter(i => i.user?.id === dto.userId
      || (i as any).user_id === dto.userId);

    let remaining = dto.amount;
    const closedIds: number[] = [];
    let totalApplied = 0;

    for (const invoice of userInvoices) {
      if (remaining <= 0) break;
      const alreadyPaid = await this.sumByUserInvoice(invoice.id);
      const invoiceRemaining = Math.max(0, Number(invoice.totalPrice) - alreadyPaid);
      if (invoiceRemaining === 0) continue;

      const toApply = Math.min(remaining, invoiceRemaining);
      const payment = this.upRepo.create({
        userInvoice: invoice, user, amount: toApply,
        paymentMethod: dto.paymentMethod,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : new Date(),
        accepted: true,
        acceptedAt: new Date(),
      });
      await this.upRepo.save(payment);
      remaining -= toApply;
      totalApplied += toApply;

      const totalPaid = await this.sumByUserInvoice(invoice.id);
      if (totalPaid >= Number(invoice.totalPrice)) {
        invoice.paid = true;
        await this.uiRepo.save(invoice);
        closedIds.push(invoice.id);
      }
    }

    return { invoicesClosed: closedIds.length, closedInvoiceIds: closedIds, totalApplied, change: remaining };
  }

  async markAccepted(id: number) {
    const payment = await this.findById(id);
    payment.accepted = true;
    payment.acceptedAt = new Date();
    return this.upRepo.save(payment);
  }

  async delete(id: number) {
    const payment = await this.findById(id);
    payment.softDelete();
    await this.upRepo.save(payment);
  }

  private async sumByUserInvoice(userInvoiceId: number): Promise<number> {
    const result = await this.upRepo.createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.user_invoice_id = :userInvoiceId AND p.deleted = false', { userInvoiceId })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  private async findById(id: number): Promise<UserPayment> {
    const p = await this.upRepo.findOne({
      where: { id, deleted: false },
      relations: ['user', 'userInvoice'],
    });
    if (!p) throw new ResourceNotFoundException('UserPayment', id);
    return p;
  }
}
