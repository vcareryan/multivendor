import { Module } from '@nestjs/common';
import { FileUploadController } from './file-upload.controller';
import { MediaController } from './media.controller';
import { FileUploadService } from './file-upload.service';
import { ImageOptimizerService } from './image-optimizer.service';

@Module({
  controllers: [FileUploadController, MediaController],
  providers: [FileUploadService, ImageOptimizerService],
})
export class FileUploadModule {}
