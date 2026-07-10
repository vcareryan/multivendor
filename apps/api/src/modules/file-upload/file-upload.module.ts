import { Module } from '@nestjs/common';
import { FileUploadController } from './file-upload.controller';
import { MediaController } from './media.controller';
import { FileUploadService } from './file-upload.service';

@Module({
  controllers: [FileUploadController, MediaController],
  providers: [FileUploadService],
})
export class FileUploadModule {}
