import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Return } from './return.entity';
import { ReturnProduct } from './return-product.entity';
import { User } from '../user/user.entity';
import { Shop } from '../shop/shop.entity';
import { Invoice } from '../invoice/invoice.entity';
import { Product } from '../product/product.entity';
import { ReturnService } from './return.service';
import { ReturnController } from './return.controller';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Return, ReturnProduct, User, Shop, Invoice, Product]),
    EventLogModule,
  ],
  providers: [ReturnService],
  controllers: [ReturnController],
  exports: [ReturnService],
})
export class ReturnModule {}
