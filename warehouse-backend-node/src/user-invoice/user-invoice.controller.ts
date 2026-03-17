import {
  Controller, Get, Post, Delete, Patch, Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { UserInvoiceService, UserInvoiceDto } from './user-invoice.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('user-invoices')
@UseGuards(JwtAuthGuard)
export class UserInvoiceController {
  constructor(private service: UserInvoiceService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get('filter')
  filter(
    @Query('userId') userId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.filter(
      userId ? parseInt(userId) : undefined,
      warehouseId ? parseInt(warehouseId) : undefined,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('unpaid/user/:userId')
  getUnpaidByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getUnpaidByUser(userId);
  }

  @Get('rep-stock/:userId')
  getRepStock(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getRepStock(userId).then(map => Object.fromEntries(map));
  }

  @Get('rep-products/:userId')
  getRepProducts(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.service.getRepProducts(userId, search, page ? parseInt(page) : 0, size ? parseInt(size) : 20);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: UserInvoiceDto) { return this.service.create(dto); }

  @Patch(':id/mark-paid')
  markPaid(@Param('id', ParseIntPipe) id: number) { return this.service.markPaid(id); }

  @Patch(':id/mark-printed')
  markPrinted(@Param('id', ParseIntPipe) id: number) { return this.service.markPrinted(id); }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
