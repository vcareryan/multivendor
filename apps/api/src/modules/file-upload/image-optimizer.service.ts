import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface OptimizedImage {
  /** The compressed image buffer (WebP format). */
  buffer: Buffer;
  /** MIME type of the output (always image/webp). */
  contentType: string;
  /** Width of the output image in pixels. */
  width: number;
  /** Height of the output image in pixels. */
  height: number;
  /** Original size in bytes (before optimization). */
  originalSize: number;
  /** Optimized size in bytes (after optimization). */
  optimizedSize: number;
}

export interface OptimizeOptions {
  /** Maximum width in pixels. Image is scaled down proportionally if wider. Default: 1200 */
  maxWidth?: number;
  /** Maximum height in pixels. Image is scaled down proportionally if taller. Default: 1200 */
  maxHeight?: number;
  /** WebP quality (1-100). Lower = smaller file. Default: 80 */
  quality?: number;
}

/**
 * Server-side image optimization service.
 *
 * Converts uploaded images to WebP format and resizes them to fit within
 * configurable max dimensions. This typically reduces file size by 60-80%
 * compared to raw PNG/JPEG uploads while maintaining good visual quality.
 *
 * GIF images are passed through without conversion to preserve animation.
 */
@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);

  /**
   * Optimize an image buffer: resize to fit within max dimensions and convert
   * to WebP for optimal compression.
   */
  async optimize(input: Buffer, options: OptimizeOptions = {}): Promise<OptimizedImage> {
    const { maxWidth = 1200, maxHeight = 1200, quality = 80 } = options;
    const originalSize = input.length;

    // Detect if the image is an animated GIF — skip optimization to preserve animation.
    const metadata = await sharp(input).metadata();
    if (metadata.format === 'gif' && (metadata.pages ?? 1) > 1) {
      this.logger.debug('Skipping optimization for animated GIF');
      return {
        buffer: input,
        contentType: 'image/gif',
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        originalSize,
        optimizedSize: input.length,
      };
    }

    const result = await sharp(input)
      .resize(maxWidth, maxHeight, {
        fit: 'inside', // Scale down to fit, never upscale
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 }) // effort 4 = good balance of speed vs compression
      .toBuffer({ resolveWithObject: true });

    const savings = originalSize > 0
      ? Math.round((1 - result.info.size / originalSize) * 100)
      : 0;

    this.logger.debug(
      `Optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(result.info.size / 1024).toFixed(0)}KB (${savings}% smaller, ${result.info.width}×${result.info.height})`,
    );

    return {
      buffer: result.data,
      contentType: 'image/webp',
      width: result.info.width,
      height: result.info.height,
      originalSize,
      optimizedSize: result.info.size,
    };
  }

  /**
   * Generate a small thumbnail for list/grid views.
   * Default: 400px max width, quality 70.
   */
  async thumbnail(input: Buffer, options: { maxWidth?: number; quality?: number } = {}): Promise<OptimizedImage> {
    return this.optimize(input, {
      maxWidth: options.maxWidth ?? 400,
      maxHeight: options.maxWidth ?? 400,
      quality: options.quality ?? 70,
    });
  }
}
