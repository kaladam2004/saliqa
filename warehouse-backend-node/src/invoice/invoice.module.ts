import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceProduct } from './invoice-product.entity';
import { Shop } from '../shop/shop.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceProduct, Shop, User, Product]),
    EventLogModule,
  ],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
