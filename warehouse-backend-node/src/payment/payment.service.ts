import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Invoice } from '../invoice/invoice.entity';
import { Shop } from '../shop/shop.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { PaymentMethod } from '../common/enums/payment-method.enum';

export class PaymentDto {
  invoiceId: number;
  shopId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  paidAt?: Date;
}

export class BulkPaymentDto {
  shopId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  paidAt?: Date;
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Shop) private shopRepo: Repository<Shop>,
    private eventLogService: EventLogService,
  ) {}

  async getAll() {
    const payments = await this.paymentRepo.find({
      where: { deleted: false },
      relations: ['invoice', 'shop'],
    });
    return payments.map(p => this.toResponse(p));
  }

  async getById(id: number) {
    return this.toResponse(await this.findById(id));
  }

  async getByUser(userId: number) {
    const payments = await this.paymentRepo.find({
      where: { deleted: false },
      relations: ['invoice', 'invoice.user', 'shop'],
    });
    return payments
      .filter(p => p.invoice?.user?.id === userId)
      .map(p => this.toResponse(p));
  }

  async filter(shopId?: number, from?: Date, to?: Date, userId?: number) {
    const qb = this.paymentRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.invoice', 'invoice')
      .leftJoinAndSelect('invoice.user', 'invoiceUser')
      .leftJoinAndSelect('p.shop', 'shop')
      .where('p.deleted = false');
    if (shopId) qb.andWhere('p.shop_id = :shopId', { shopId });
    if (from) qb.andWhere('p.paid_at >= :from', { from });
    if (to) qb.andWhere('p.paid_at <= :to', { to });
    if (userId) qb.andWhere('invoiceUser.id = :userId', { userId });
    const payments = await qb.getMany();
    return payments.map(p => this.toResponse(p));
  }

  async create(dto: PaymentDto) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: dto.invoiceId, deleted: false },
    });
    if (!invoice) throw new ResourceNotFoundException('Invoice', dto.invoiceId);
    const shop = await this.shopRepo.findOne({ where: { id: dto.shopId, deleted: false } });
    if (!shop) throw new ResourceNotFoundException('Shop', dto.shopId);

    const alreadyPaid = await this.sumByInvoice(invoice.id);
    const remaining = Math.max(0, Number(invoice.totalPrice) - alreadyPaid);
    const actualAmount = dto.amount > remaining ? remaining : dto.amount;
    const change = dto.amount - actualAmount;

    const payment = this.paymentRepo.create({
      invoice, shop,
      amount: actualAmount,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
    });
    const saved = await this.paymentRepo.save(payment);

    await this.eventLogService.log(null, 'SYSTEM', 'system', EventType.PAYMENT_RECEIVED,
      `Payment received: ${actualAmount} from shop: ${shop.title}`, 'Payment', saved.id);

    const totalPaid = await this.sumByInvoice(invoice.id);
    if (totalPaid >= Number(invoice.totalPrice)) {
      await this.invoiceRepo.update(invoice.id, { paid: true });
    }

    return this.toResponse(saved, change);
  }

  async delete(id: number) {
    const payment = await this.findById(id);
    payment.softDelete();
    await this.paymentRepo.save(payment);
  }

  async bulkPay(dto: BulkPaymentDto) {
    const shop = await this.shopRepo.findOne({ where: { id: dto.shopId, deleted: false } });
    if (!shop) throw new ResourceNotFoundException('Shop', dto.shopId);

    const shopInvoices = await this.invoiceRepo
      .createQueryBuilder('i')
      .where('i.shop_id = :shopId AND i.paid = false AND i.deleted = false', { shopId: dto.shopId })
      .orderBy('i.date', 'ASC')
      .getMany();

    let remaining = dto.amount;
    const closedIds: number[] = [];
    let totalApplied = 0;

    for (const invoice of shopInvoices) {
      if (remaining <= 0) break;
      const alreadyPaid = await this.sumByInvoice(invoice.id);
      const invoiceRemaining = Math.max(0, Number(invoice.totalPrice) - alreadyPaid);
      if (invoiceRemaining === 0) continue;

      const toApply = Math.min(remaining, invoiceRemaining);
      const payment = this.paymentRepo.create({
        invoice, shop, amount: toApply,
        paymentMethod: dto.paymentMethod,
        description: dto.description,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      });
      await this.paymentRepo.save(payment);
      remaining -= toApply;
      totalApplied += toApply;

      // alreadyPaid + toApply gives total paid without extra DB call
      if (alreadyPaid + toApply >= Number(invoice.totalPrice)) {
        await this.invoiceRepo.update(invoice.id, { paid: true });
        closedIds.push(invoice.id);
      }
    }

    return { invoicesClosed: closedIds.length, closedInvoiceIds: closedIds, totalApplied, change: remaining };
  }

  private async sumByInvoice(invoiceId: number): Promise<number> {
    const result = await this.paymentRepo.createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.invoice_id = :invoiceId AND p.deleted = false', { invoiceId })
      .getRawOne();
    return parseFloat(result?.total || '0');
  }

  private async findById(id: number): Promise<Payment> {
    const p = await this.paymentRepo.findOne({
      where: { id, deleted: false },
      relations: ['invoice', 'shop'],
    });
    if (!p) throw new ResourceNotFoundException('Payment', id);
    return p;
  }

  toResponse(p: Payment, change = 0) {
    return {
      id: p.id,
      invoiceId: p.invoice?.id,
      shopId: p.shop?.id,
      shopTitle: p.shop?.title,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      description: p.description,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      change,
    };
  }
}
