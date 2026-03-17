import {
  Controller, Get, Post, Delete, Patch, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { UserPaymentService, UserPaymentDto, BulkUserPaymentDto } from './user-payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('user-payments')
@UseGuards(JwtAuthGuard)
export class UserPaymentController {
  constructor(private service: UserPaymentService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get('pending')
  getPending() { return this.service.getPending(); }

  @Get('by-user/:userId')
  getByUser(@Param('userId', ParseIntPipe) userId: number) { return this.service.getByUser(userId); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: UserPaymentDto) { return this.service.create(dto); }

  @Post('bulk')
  bulkPay(@Body() dto: BulkUserPaymentDto) { return this.service.bulkPay(dto); }

  @Patch(':id/accept')
  markAccepted(@Param('id', ParseIntPipe) id: number) { return this.service.markAccepted(id); }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
