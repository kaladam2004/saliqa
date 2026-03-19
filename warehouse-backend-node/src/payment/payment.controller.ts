import {
  Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { PaymentService, PaymentDto, BulkPaymentDto } from './payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private service: PaymentService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get('filter')
  filter(
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.filter(
      shopId ? parseInt(shopId) : undefined,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      userId ? parseInt(userId) : undefined,
    );
  }

  @Get('by-user/:userId')
  getByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getByUser(userId);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: PaymentDto) { return this.service.create(dto); }

  @Post('bulk')
  bulkPay(@Body() dto: BulkPaymentDto) { return this.service.bulkPay(dto); }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
