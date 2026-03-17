import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ShopService, ShopDto } from './shop.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('shops')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private service: ShopService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: ShopDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: ShopDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
