import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from '@utanstore/shared';
import { getRequestContext } from '../../common/context/request-context';
import { ImageOptimizerService } from './image-optimizer.service';
import type { Env } from '../../config/env.validation';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly mediaBase: string;

  constructor(
    config: ConfigService<Env, true>,
    private readonly optimizer: ImageOptimizerService,
  ) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.publicUrl = config.get('S3_PUBLIC_URL', { infer: true });
    const baseDomain = config.get('APP_BASE_DOMAIN', { infer: true });
    // Objects are served back through the API (api.<domain>/api/v1/media/<key>)
    // so we don't need MinIO to be publicly reachable or a separate CDN host.
    this.mediaBase = `https://api.${baseDomain}/api/v1/media`;
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
   * tenant's key prefix. (Kept for future direct-to-S3 uploads / CDN setups.)
   */
  async createUploadUrl(params: { filename: string; contentType: string; sizeBytes?: number }) {
    this.assertAllowed(params.contentType, params.sizeBytes);
    const key = this.keyFor(params.contentType);
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: params.contentType });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { uploadUrl, key, publicUrl: `${this.mediaBase}/${key}`, expiresIn: 300 };
  }

  /**
   * Accepts a base64-encoded image, **optimizes it** (resize + convert to WebP),
   * stores it in object storage, and returns a public URL served back through
   * the API. This works on a single VPS where MinIO is only reachable on the
   * internal network.
   *
   * Optimization typically reduces file size by 60-80% while maintaining good
   * visual quality, significantly extending storage life.
   */
  async uploadImage(params: { filename?: string; contentType: string; dataBase64: string }) {
    this.assertAllowed(params.contentType);
    const base64 = params.dataBase64.includes(',') ? params.dataBase64.split(',')[1] : params.dataBase64;
    const rawBuffer = Buffer.from(base64, 'base64');
    if (rawBuffer.length === 0) throw new BadRequestException('Empty file');
    if (rawBuffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`File too large. Max ${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)}MB`);
    }

    // Optimize: resize to max 1200px and convert to WebP for best compression.
    const optimized = await this.optimizer.optimize(rawBuffer, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 80,
    });

    this.logger.log(
      `Image optimized: ${(optimized.originalSize / 1024).toFixed(0)}KB → ${(optimized.optimizedSize / 1024).toFixed(0)}KB ` +
      `(${Math.round((1 - optimized.optimizedSize / optimized.originalSize) * 100)}% saved)`,
    );

    const key = this.keyFor(optimized.contentType);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: optimized.buffer,
        ContentType: optimized.contentType,
      }),
    );
    return { url: `${this.mediaBase}/${key}`, key };
  }

  /** Fetch a stored object for streaming back to the client. */
  async getObject(key: string) {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      body: res.Body as NodeJS.ReadableStream,
      contentType: res.ContentType ?? 'application/octet-stream',
      contentLength: res.ContentLength,
    };
  }

  private assertAllowed(contentType: string, sizeBytes?: number): void {
    if (!ALLOWED_IMAGE_MIME.includes(contentType)) {
      throw new BadRequestException(`Unsupported file type. Allowed: ${ALLOWED_IMAGE_MIME.join(', ')}`);
    }
    if (sizeBytes && sizeBytes > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`File too large. Max ${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)}MB`);
    }
  }

  private keyFor(contentType: string): string {
    const tenantId = getRequestContext()?.tenantId ?? 'shared';
    return `stores/${tenantId}/${new Date().getFullYear()}/${randomUUID()}${this.extFor(contentType)}`;
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
