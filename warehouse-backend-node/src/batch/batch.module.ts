import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from '../product/batch.entity';
import { Product } from '../product/product.entity';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, Product])],
  providers: [BatchService],
  controllers: [BatchController],
})
export class BatchModule {}
