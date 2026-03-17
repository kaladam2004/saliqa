import { NotFoundException } from '@nestjs/common';

export class ResourceNotFoundException extends NotFoundException {
  constructor(resource: string, id: number | string) {
    super(`${resource} not found with id: ${id}`);
  }
}
