import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPayment } from './user-payment.entity';
import { UserInvoice } from '../user-invoice/user-invoice.entity';
import { User } from '../user/user.entity';
import { UserPaymentService } from './user-payment.service';
import { UserPaymentController } from './user-payment.controller';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserPayment, UserInvoice, User]), EventLogModule],
  providers: [UserPaymentService],
  controllers: [UserPaymentController],
  exports: [UserPaymentService],
})
export class UserPaymentModule {}
