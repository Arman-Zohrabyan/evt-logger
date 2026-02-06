import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  VideoJob,
  VideoJobDocument,
  VideoJobStatus,
} from './schemas/video-job.schema';
import { VIDEO_GENERATION_QUEUE } from './constants';
import { EventsService } from '../events/events.service';

const METADATA_FIELDS = ['sessionId', 'apiKey', 'userId', 'ip', 'pageUrl'];

@Processor(VIDEO_GENERATION_QUEUE, { concurrency: 1 })
export class VideoGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoGenerationProcessor.name);

  constructor(
    @InjectModel(VideoJob.name)
    private videoJobModel: Model<VideoJobDocument>,
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(
    job: Job<{ videoJobId: string; sessionId: string }>,
  ): Promise<void> {
    const { videoJobId, sessionId } = job.data;
    this.logger.log(
      `Processing video generation for session: ${sessionId}, job: ${videoJobId}`,
    );

    await this.videoJobModel.findByIdAndUpdate(videoJobId, {
      status: VideoJobStatus.PROCESSING,
      startedAt: new Date(),
    });

    let tempInputFile: string | null = null;

    try {
      // 1. Fetch rrweb events
      const rawEvents = await this.eventsService.getSessionReplay(sessionId);
      if (!rawEvents || rawEvents.length === 0) {
        throw new Error(`No rrweb events found for session ${sessionId}`);
      }

      // 2. Transform: strip metadata fields from payload (same logic as session-replay.html)
      const rrwebEvents = rawEvents.map((evt) => {
        const p = (evt as any).payload || {};
        const rrwebEvt: Record<string, any> = {};
        for (const key of Object.keys(p)) {
          if (METADATA_FIELDS.includes(key)) continue;
          rrwebEvt[key] = p[key];
        }
        return rrwebEvt;
      });

      // 3. Write events to temp JSON file
      tempInputFile = path.join(os.tmpdir(), `rrvideo-${videoJobId}.json`);
      fs.writeFileSync(tempInputFile, JSON.stringify(rrwebEvents));

      // 4. Determine output path
      const outputDir = this.configService.get<string>(
        'VIDEO_OUTPUT_DIR',
        './generated-videos',
      );
      const outputFile = path.join(outputDir, `${videoJobId}.webm`);

      // 5. Call rrvideo
      const { transformToVideo } = await import('@amplitude/rrvideo');
      const startTime = Date.now();

      await transformToVideo({
        input: tempInputFile,
        output: outputFile,
        headless: true,
        rrwebPlayer: {
          speed: 4,
          skipInactive: true,
        },
      });

      const durationMs = Date.now() - startTime;
      const stats = fs.statSync(outputFile);

      // 6. Update job as completed
      await this.videoJobModel.findByIdAndUpdate(videoJobId, {
        status: VideoJobStatus.COMPLETED,
        filePath: outputFile,
        fileSize: stats.size,
        durationMs,
        completedAt: new Date(),
      });

      this.logger.log(
        `Video generated for session ${sessionId}: ${outputFile} (${stats.size} bytes, ${durationMs}ms)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Video generation failed for session ${sessionId}: ${errorMessage}`,
      );

      await this.videoJobModel.findByIdAndUpdate(videoJobId, {
        status: VideoJobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });

      throw error;
    } finally {
      if (tempInputFile && fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
