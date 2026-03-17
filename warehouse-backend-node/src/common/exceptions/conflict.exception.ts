import { ConflictException } from '@nestjs/common';

export class AppConflictException extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}
