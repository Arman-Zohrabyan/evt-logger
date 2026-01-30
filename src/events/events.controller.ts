import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
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
  createBulk(@Body() bulkEventsDto: BulkEventsDto) {
    return this.eventsService.createBulk(bulkEventsDto);
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
  @ApiQuery({ name: 'website', required: true, description: 'Website hostname (e.g. localhost:3000)' })
  getSessions(@Query('website') website: string) {
    return this.eventsService.getSessions(website);
  }

  @Get('session-info/:sessionId')
  @ApiOperation({ summary: 'Get non-rrweb session events (device, battery, etc.)' })
  getSessionInfo(@Param('sessionId') sessionId: string) {
    return this.eventsService.getSessionInfo(sessionId);
  }

  @Get('session-replay/:sessionId')
  @ApiOperation({ summary: 'Get rrweb replay events for a session' })
  getSessionReplay(@Param('sessionId') sessionId: string) {
    return this.eventsService.getSessionReplay(sessionId);
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
