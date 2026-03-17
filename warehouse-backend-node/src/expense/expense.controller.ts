import {
  Controller, Get, Post, Delete, Patch, Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ExpenseService, ExpenseDto } from './expense.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private service: ExpenseService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get('filter')
  filter(
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.filter(userId ? parseInt(userId) : undefined, from, to);
  }

  @Get('by-admin/:adminId')
  getByAdmin(@Param('adminId', ParseIntPipe) adminId: number) { return this.service.getByAdmin(adminId); }

  @Get('by-user/:userId')
  getByUser(@Param('userId', ParseIntPipe) userId: number) { return this.service.getByUser(userId); }

  @Get('pending-user')
  getPendingUser() { return this.service.getPendingUser(); }

  @Post()
  create(@Body() dto: ExpenseDto) { return this.service.create(dto); }

  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @Query('adminId', ParseIntPipe) adminId: number) {
    return this.service.approve(id, adminId);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
