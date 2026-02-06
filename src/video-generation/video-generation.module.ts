import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { VideoGenerationController } from './video-generation.controller';
import { VideoGenerationService } from './video-generation.service';
import { VideoGenerationProcessor } from './video-generation.processor';
import { VideoJob, VideoJobSchema } from './schemas/video-job.schema';
import { VIDEO_GENERATION_QUEUE } from './constants';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    forwardRef(() => EventsModule),
    MongooseModule.forFeature([
      { name: VideoJob.name, schema: VideoJobSchema },
    ]),
    BullModule.registerQueue({ name: VIDEO_GENERATION_QUEUE }),
  ],
  controllers: [VideoGenerationController],
  providers: [VideoGenerationService, VideoGenerationProcessor],
  exports: [VideoGenerationService],
})
export class VideoGenerationModule {}
