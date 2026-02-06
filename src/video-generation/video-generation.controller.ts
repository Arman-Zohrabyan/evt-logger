import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { VideoGenerationService } from './video-generation.service';
import { GenerateVideoDto } from './dto/generate-video.dto';

@ApiTags('video-generation')
@Controller('video-generation')
export class VideoGenerationController {
  constructor(
    private readonly videoGenerationService: VideoGenerationService,
  ) {}

  @Post(':sessionId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request video generation for a session replay' })
  @ApiParam({ name: 'sessionId', description: 'The session ID' })
  @ApiResponse({ status: 202, description: 'Video generation job accepted' })
  async requestGeneration(@Param('sessionId') sessionId: string) {
    const job = await this.videoGenerationService.enqueueJob(sessionId);
    return {
      jobId: (job as any)._id,
      sessionId: job.sessionId,
      status: job.status,
      message:
        'Video generation job accepted. Poll the status endpoint for progress.',
    };
  }

  @Get('session/:sessionId/jobs')
  @ApiOperation({
    summary: 'List all video generation jobs for a session',
  })
  @ApiParam({ name: 'sessionId', description: 'The session ID' })
  async getSessionJobs(@Param('sessionId') sessionId: string) {
    return this.videoGenerationService.getJobsBySession(sessionId);
  }

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Check video generation job status' })
  @ApiParam({ name: 'jobId', description: 'The video job ID' })
  async getStatus(@Param('jobId') jobId: string) {
    const job = await this.videoGenerationService.getJobStatus(jobId);
    return {
      jobId: (job as any)._id,
      sessionId: job.sessionId,
      status: job.status,
      fileSize: job.fileSize,
      durationMs: job.durationMs,
      errorMessage: job.errorMessage,
      createdAt: (job as any).createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  @Get(':jobId/download')
  @ApiOperation({ summary: 'Download the generated video' })
  @ApiParam({ name: 'jobId', description: 'The video job ID' })
  @ApiResponse({ status: 200, description: 'Video file stream' })
  @ApiResponse({ status: 404, description: 'Video not ready or not found' })
  async downloadVideo(@Param('jobId') jobId: string, @Res() res: Response) {
    const filePath = await this.videoGenerationService.getFilePath(jobId);
    res.download(filePath, `session-replay-${jobId}.webm`);
  }
}
