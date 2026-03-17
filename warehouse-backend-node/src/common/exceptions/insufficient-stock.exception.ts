import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientStockException extends HttpException {
  constructor(productName: string, requested: number, available: number) {
    super(
      `Insufficient stock for "${productName}": requested ${requested}, available ${available}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
