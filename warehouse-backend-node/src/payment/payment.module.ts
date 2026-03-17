import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Invoice } from '../invoice/invoice.entity';
import { Shop } from '../shop/shop.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Invoice, Shop]), EventLogModule],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}
