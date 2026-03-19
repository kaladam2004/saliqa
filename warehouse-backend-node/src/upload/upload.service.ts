import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './photos';
  private readonly allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif',  // iOS native format
  ];
  private readonly maxSize = 20 * 1024 * 1024; // 20MB

  async store(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    if (!this.allowedTypes.includes(file.mimetype?.toLowerCase())) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}. Allowed: jpeg, png, webp, heic`);
    }
    if (file.size > this.maxSize) {
      throw new BadRequestException('File size exceeds 20MB limit.');
    }

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Always convert to JPEG for consistent output (handles HEIC, PNG, WEBP, GIF input too)
    const filename = uuidv4() + '.jpg';
    const filepath = path.join(this.uploadDir, filename);

    await sharp(file.buffer)
      .rotate() // auto-rotate based on EXIF orientation
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(filepath);

    return `/photos/${filename}`;
  }
}
