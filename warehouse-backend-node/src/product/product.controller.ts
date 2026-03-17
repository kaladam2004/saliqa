import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ProductService, ProductDto } from './product.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private service: ProductService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post('batch')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createBatch(@Body() dtos: ProductDto[]) { return this.service.createBatch(dtos); }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: ProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }

  @Post('warehouses/:warehouseId/add')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  addToWarehouse(@Param('warehouseId', ParseIntPipe) warehouseId: number, @Body() productIds: number[]) {
    return this.service.addToWarehouse(warehouseId, productIds);
  }

  @Patch(':id/quantity')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  addQuantity(@Param('id', ParseIntPipe) id: number, @Body() body: { quantity: number; adminId?: number; notes?: string }) {
    return this.service.addQuantity(id, body.quantity, body.adminId, body.notes);
  }
}
