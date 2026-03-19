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
  const corsOrigins = process.env.CORS_ORIGINS;
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',') : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Serve photos folder
  const uploadDir = process.env.UPLOAD_DIR || './photos';
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(path.resolve(uploadDir), { prefix: '/photos' });
  // Backward-compat: also serve old /uploads path if it exists
  const legacyUploads = './uploads';
  if (fs.existsSync(legacyUploads)) {
    app.useStaticAssets(path.resolve(legacyUploads), { prefix: '/uploads' });
  }

  // Serve frontend (warehouse-ui/dist) on same port
  const frontendDist = path.resolve(__dirname, '../../warehouse-ui/dist');
  if (fs.existsSync(frontendDist)) {
    app.useStaticAssets(frontendDist);
    // SPA fallback — serve index.html for all non-api/non-uploads routes
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get(/^(?!\/api|\/uploads|\/photos).*/, (_req: any, res: any) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
    console.log(`🌐 Frontend served from ${frontendDist}`);
  }

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = parseInt(process.env.PORT || '8080');
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api`);
}

bootstrap();
