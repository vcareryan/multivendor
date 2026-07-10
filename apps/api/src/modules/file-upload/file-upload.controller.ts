import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@utanstore/shared';
import { FileUploadService } from './file-upload.service';
import { Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('file-upload')
@UseGuards(TenantGuard)
@Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
@Controller('admin/uploads')
export class FileUploadController {
  constructor(private readonly uploads: FileUploadService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get a presigned URL to upload an image directly to storage' })
  presign(@Body() body: { filename: string; contentType: string; sizeBytes?: number }) {
    return this.uploads.createUploadUrl(body);
  }
}
