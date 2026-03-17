import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from './template.entity';
import { TemplateController } from './template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Template])],
  controllers: [TemplateController],
})
export class TemplateModule {}
