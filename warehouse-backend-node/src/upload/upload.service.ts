import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';
  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly maxSize = 10 * 1024 * 1024; // 10MB

  async store(file: Express.Multer.File): Promise<string> {
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }
    if (file.size > this.maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit.');
    }

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = uuidv4() + ext;
    const filepath = path.join(this.uploadDir, filename);

    await sharp(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .toFile(filepath);

    return `/uploads/${filename}`;
  }
}
