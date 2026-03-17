import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './template.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(
    @InjectRepository(Template) private repo: Repository<Template>,
  ) {}

  @Get()
  getAll() { return this.repo.find(); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.repo.findOneBy({ id }); }

  @Post()
  create(@Body() body: { key: string; value: string }) {
    return this.repo.save(this.repo.create(body));
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { key: string; value: string }) {
    return this.repo.save({ id, ...body });
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.repo.delete(id);
  }
}
