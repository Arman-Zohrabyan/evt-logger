import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VideoJobDocument = HydratedDocument<VideoJob>;

export enum VideoJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class VideoJob {
  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({
    required: true,
    enum: VideoJobStatus,
    default: VideoJobStatus.PENDING,
  })
  status: VideoJobStatus;

  @Prop()
  filePath: string;

  @Prop()
  fileSize: number;

  @Prop()
  durationMs: number;

  @Prop()
  errorMessage: string;

  @Prop()
  startedAt: Date;

  @Prop()
  completedAt: Date;
}

export const VideoJobSchema = SchemaFactory.createForClass(VideoJob);
