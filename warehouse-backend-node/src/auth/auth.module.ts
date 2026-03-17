import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Admin } from '../admin/admin.entity';
import { User } from '../user/user.entity';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'WH-404secret-key-for-warehouse-management-system-2024-very-long-key',
    }),
    EventLogModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
