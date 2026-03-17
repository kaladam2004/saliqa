import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReturn } from './user-return.entity';
import { Product } from '../product/product.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { User } from '../user/user.entity';
import { UserInvoice } from '../user-invoice/user-invoice.entity';
import { UserReturnService } from './user-return.service';
import { UserReturnController } from './user-return.controller';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserReturn, Product, Warehouse, User, UserInvoice]),
    EventLogModule,
  ],
  providers: [UserReturnService],
  controllers: [UserReturnController],
  exports: [UserReturnService],
})
export class UserReturnModule {}
