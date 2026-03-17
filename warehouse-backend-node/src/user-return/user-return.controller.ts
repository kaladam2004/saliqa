import {
  Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { UserReturnService, UserReturnDto } from './user-return.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('user-returns')
@UseGuards(JwtAuthGuard)
export class UserReturnController {
  constructor(private service: UserReturnService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: UserReturnDto) { return this.service.create(dto); }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }
}
