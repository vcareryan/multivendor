import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from '@utanstore/shared';
import { getRequestContext } from '../../common/context/request-context';
import type { Env } from '../../config/env.validation';

@Injectable()
export class FileUploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.publicUrl = config.get('S3_PUBLIC_URL', { infer: true });
    this.s3 = new S3Client({
      region: config.get('S3_REGION', { infer: true }),
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  /**
   * Returns a presigned PUT URL for a validated image upload, scoped to the
   * tenant's key prefix. The client uploads directly to S3/MinIO (CDN-ready).
   */
  async createUploadUrl(params: { filename: string; contentType: string; sizeBytes?: number }) {
    if (!ALLOWED_IMAGE_MIME.includes(params.contentType)) {
      throw new BadRequestException(`Unsupported file type. Allowed: ${ALLOWED_IMAGE_MIME.join(', ')}`);
    }
    if (params.sizeBytes && params.sizeBytes > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`File too large. Max ${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)}MB`);
    }

    const tenantId = getRequestContext()?.tenantId ?? 'shared';
    const ext = this.extFor(params.contentType);
    const key = `stores/${tenantId}/${new Date().getFullYear()}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: params.contentType });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    return { uploadUrl, key, publicUrl: `${this.publicUrl}/${key}`, expiresIn: 300 };
  }

  private extFor(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
    };
    return map[mime] ?? '';
  }
}
