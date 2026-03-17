import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInvoice } from './user-invoice.entity';
import { UserInvoiceProduct } from './user-invoice-product.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { UserPayment } from '../user-payment/user-payment.entity';
import { UserInvoiceService } from './user-invoice.service';
import { UserInvoiceController } from './user-invoice.controller';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserInvoice, UserInvoiceProduct, Warehouse, User, Product, UserPayment]),
    EventLogModule,
  ],
  providers: [UserInvoiceService],
  controllers: [UserInvoiceController],
  exports: [UserInvoiceService],
})
export class UserInvoiceModule {}
