import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
  app.enableCors({
    origin: origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Serve uploads folder
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(path.resolve(uploadDir), { prefix: '/uploads' });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = parseInt(process.env.PORT || '8080');
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api`);
}

bootstrap();
