import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { BulkEventsDto } from './dto/bulk-events.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Ingest a batch of tracker events' })
  createBulk(@Body() bulkEventsDto: BulkEventsDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    return this.eventsService.createBulk(bulkEventsDto, ip);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get('websites')
  @ApiOperation({ summary: 'Get distinct monitored websites' })
  getWebsites() {
    return this.eventsService.getWebsites();
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get sessions for a website' })
  @ApiQuery({
    name: 'website',
    required: true,
    description: 'Website hostname (e.g. localhost:3000)',
  })
  getSessions(@Query('website') website: string) {
    return this.eventsService.getSessions(website);
  }

  @Get('session-info/:sessionId')
  @ApiOperation({
    summary: 'Get non-rrweb session events (device, battery, etc.)',
  })
  getSessionInfo(@Param('sessionId') sessionId: string) {
    return this.eventsService.getSessionInfo(sessionId);
  }

  @Get('session-replay/:sessionId')
  @ApiOperation({ summary: 'Get rrweb replay events for a session' })
  getSessionReplay(@Param('sessionId') sessionId: string) {
    return this.eventsService.getSessionReplay(sessionId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get distinct users for a website' })
  @ApiQuery({
    name: 'website',
    required: true,
    description: 'Website hostname (e.g. localhost:3000)',
  })
  getUsers(@Query('website') website: string) {
    return this.eventsService.getUsers(website);
  }

  @Get('user/:userId/sessions')
  @ApiOperation({ summary: 'Get all sessions for a specific user' })
  getUserSessions(@Param('userId') userId: string) {
    return this.eventsService.getUserSessions(userId);
  }

  @Get('user/:userId/journey')
  @ApiOperation({ summary: 'Get complete user journey across all sessions' })
  getUserJourney(@Param('userId') userId: string) {
    return this.eventsService.getUserJourney(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event by ID' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an event' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
