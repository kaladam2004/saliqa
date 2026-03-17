import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { UserService, UserDto } from './user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private service: UserService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) { return this.service.getById(id); }

  @Post()
  create(@Body() dto: UserDto) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) { return this.service.delete(id); }

  @Patch(':id/gps')
  updateGps(@Param('id', ParseIntPipe) id: number, @Body() body: { gps: string }) {
    return this.service.updateGps(id, body.gps);
  }
}
