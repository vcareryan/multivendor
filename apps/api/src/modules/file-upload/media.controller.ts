import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { FileUploadService } from './file-upload.service';
import { Public } from '../../common/decorators';

/**
 * Public, read-only media proxy. Streams stored images back through the API so
 * object storage (MinIO) never has to be exposed to the internet and no
 * separate CDN host is required. Cacheable + CDN-friendly (immutable keys).
 */
@ApiTags('media')
@SkipThrottle()
@Controller('media')
export class MediaController {
  constructor(private readonly uploads: FileUploadService) {}

  @Public()
  @Get('*')
  @ApiOperation({ summary: 'Fetch a stored image by key' })
  async get(@Param('0') key: string, @Res() res: Response): Promise<void> {
    if (!key) throw new NotFoundException('Not found');
    try {
      const obj = await this.uploads.getObject(key);
      res.setHeader('Content-Type', obj.contentType);
      if (obj.contentLength) res.setHeader('Content-Length', String(obj.contentLength));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      obj.body.pipe(res);
    } catch {
      throw new NotFoundException('Image not found');
    }
  }
}
