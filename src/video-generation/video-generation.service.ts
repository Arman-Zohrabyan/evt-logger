import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import {
  VideoJob,
  VideoJobDocument,
  VideoJobStatus,
} from './schemas/video-job.schema';
import { VIDEO_GENERATION_QUEUE, GENERATE_VIDEO_JOB } from './constants';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);
  private readonly outputDir: string;

  constructor(
    @InjectModel(VideoJob.name)
    private videoJobModel: Model<VideoJobDocument>,
    @InjectQueue(VIDEO_GENERATION_QUEUE) private videoQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.outputDir = this.configService.get<string>(
      'VIDEO_OUTPUT_DIR',
      './generated-videos',
    );
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async enqueueJob(sessionId: string): Promise<VideoJob> {
    // Skip if a job already exists for this session
    const existing = await this.videoJobModel.findOne({
      sessionId,
      status: { $in: [VideoJobStatus.PENDING, VideoJobStatus.PROCESSING] },
    });
    if (existing) {
      this.logger.log(
        `Video job already in progress for session ${sessionId}, skipping`,
      );
      return existing;
    }

    const videoJob = new this.videoJobModel({
      sessionId,
      status: VideoJobStatus.PENDING,
    });
    const saved = await videoJob.save();

    await this.videoQueue.add(
      GENERATE_VIDEO_JOB,
      {
        videoJobId: saved._id.toString(),
        sessionId,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Video generation job enqueued for session ${sessionId} (job: ${saved._id})`,
    );
    return saved;
  }

  async getJobStatus(jobId: string): Promise<VideoJob> {
    const job = await this.videoJobModel.findById(jobId).exec();
    if (!job) {
      throw new NotFoundException(`Video job "${jobId}" not found`);
    }
    return job;
  }

  async getJobsBySession(sessionId: string): Promise<VideoJob[]> {
    return this.videoJobModel
      .find({ sessionId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getFilePath(jobId: string): Promise<string> {
    const job = await this.videoJobModel.findById(jobId).exec();
    if (!job) {
      throw new NotFoundException(`Video job "${jobId}" not found`);
    }
    if (job.status !== VideoJobStatus.COMPLETED) {
      throw new NotFoundException(
        `Video not yet available (status: ${job.status})`,
      );
    }
    if (!job.filePath || !fs.existsSync(job.filePath)) {
      throw new NotFoundException('Video file not found on disk');
    }
    return job.filePath;
  }

  getOutputDir(): string {
    return this.outputDir;
  }
}
