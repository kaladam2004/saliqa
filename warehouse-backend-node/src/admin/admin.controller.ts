import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { AdminService, AdminDto } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: AdminDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }

  @Patch(':id/warehouses')
  assignWarehouses(@Param('id', ParseIntPipe) id: number, @Body() body: { warehouseIds: number[] }) {
    return this.service.assignWarehouses(id, body.warehouseIds);
  }
}
