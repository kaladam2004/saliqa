import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { Admin } from '../admin/admin.entity';
import { User } from '../user/user.entity';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, Admin, User])],
  providers: [ExpenseService],
  controllers: [ExpenseController],
})
export class ExpenseModule {}
