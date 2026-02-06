import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event, EventSchema } from './schemas/event.schema';
import { VideoGenerationModule } from '../video-generation/video-generation.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    forwardRef(() => VideoGenerationModule),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
