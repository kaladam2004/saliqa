import 'dotenv/config';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { Admin } from './admin/admin.entity';
import { User } from './user/user.entity';
import { Warehouse } from './warehouse/warehouse.entity';
import { Shop } from './shop/shop.entity';
import { Product } from './product/product.entity';
import { Batch } from './product/batch.entity';
import { ProductQtyTransaction } from './product/product-qty-transaction.entity';
import { Invoice } from './invoice/invoice.entity';
import { InvoiceProduct } from './invoice/invoice-product.entity';
import { Payment } from './payment/payment.entity';
import { UserInvoice } from './user-invoice/user-invoice.entity';
import { UserInvoiceProduct } from './user-invoice/user-invoice-product.entity';
import { UserPayment } from './user-payment/user-payment.entity';
import { Return } from './return/return.entity';
import { ReturnProduct } from './return/return-product.entity';
import { UserReturn } from './user-return/user-return.entity';
import { Expense } from './expense/expense.entity';
import { EventLog } from './event-log/event-log.entity';
import { Template } from './template/template.entity';
import { AdminRole } from './common/enums/admin-role.enum';

import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { ShopModule } from './shop/shop.module';
import { ProductModule } from './product/product.module';
import { BatchModule } from './batch/batch.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { UserInvoiceModule } from './user-invoice/user-invoice.module';
import { UserPaymentModule } from './user-payment/user-payment.module';
import { ReturnModule } from './return/return.module';
import { UserReturnModule } from './user-return/user-return.module';
import { ExpenseModule } from './expense/expense.module';
import { EventLogModule } from './event-log/event-log.module';
import { UploadModule } from './upload/upload.module';
import { TemplateModule } from './template/template.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres' as const,
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        entities: [
          Admin, User, Warehouse, Shop, Product, Batch, ProductQtyTransaction,
          Invoice, InvoiceProduct, Payment,
          UserInvoice, UserInvoiceProduct, UserPayment,
          Return, ReturnProduct, UserReturn,
          Expense, EventLog, Template,
        ],
        synchronize: false,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([Admin]),
    AuthModule,
    AdminModule,
    UserModule,
    WarehouseModule,
    ShopModule,
    ProductModule,
    BatchModule,
    InvoiceModule,
    PaymentModule,
    UserInvoiceModule,
    UserPaymentModule,
    ReturnModule,
    UserReturnModule,
    ExpenseModule,
    EventLogModule,
    UploadModule,
    TemplateModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
  ) {}

  async onModuleInit() {
    const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const exists = await this.adminRepo.findOne({ where: { username } });
    if (!exists) {
      const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@1234';
      const fullname = process.env.SUPER_ADMIN_FULLNAME || 'Super Administrator';
      const admin = this.adminRepo.create({
        username,
        password: await bcrypt.hash(password, 10),
        fullname,
        role: AdminRole.SUPER_ADMIN,
      });
      await this.adminRepo.save(admin);
      console.log(`Super admin created: ${username}`);
    }
  }
}
