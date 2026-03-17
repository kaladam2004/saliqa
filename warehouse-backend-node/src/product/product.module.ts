import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { Batch } from './batch.entity';
import { ProductQtyTransaction } from './product-qty-transaction.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { Admin } from '../admin/admin.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Batch, ProductQtyTransaction, Warehouse, Admin]),
    EventLogModule,
  ],
  providers: [ProductService],
  controllers: [ProductController],
  exports: [ProductService],
})
export class ProductModule {}
