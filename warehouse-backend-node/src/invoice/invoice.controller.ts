import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { InvoiceService, InvoiceDto } from './invoice.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private service: InvoiceService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get('stats')
  getStats() { return this.service.getStats(); }

  @Get('filter')
  filter(
    @Query('shopId') shopId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.filter(
      shopId ? parseInt(shopId) : undefined,
      userId ? parseInt(userId) : undefined,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: InvoiceDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: InvoiceDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/mark-paid')
  markPaid(@Param('id', ParseIntPipe) id: number) { return this.service.markPaid(id); }

  @Patch(':id/mark-printed')
  markPrinted(@Param('id', ParseIntPipe) id: number) { return this.service.markPrinted(id); }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
