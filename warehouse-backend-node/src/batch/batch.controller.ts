import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { BatchService, BatchDto } from './batch.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('batches')
@UseGuards(JwtAuthGuard)
export class BatchController {
  constructor(private service: BatchService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: BatchDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: BatchDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
