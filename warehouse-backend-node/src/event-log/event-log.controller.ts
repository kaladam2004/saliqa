import { Controller, Get, UseGuards } from '@nestjs/common';
import { EventLogService } from './event-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('event-logs')
@UseGuards(JwtAuthGuard)
export class EventLogController {
  constructor(private service: EventLogService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }
}
