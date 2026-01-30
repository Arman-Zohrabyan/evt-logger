import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { BulkEventsDto } from './dto/bulk-events.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const createdEvent = new this.eventModel(createEventDto);
    return createdEvent.save();
  }

  async createBulk(bulkEventsDto: BulkEventsDto): Promise<{ inserted: number }> {
    const docs = bulkEventsDto.events.map((evt) => ({
      type: evt.type,
      payload: {
        ...evt.data,
        sessionId: bulkEventsDto.sessionId,
        apiKey: bulkEventsDto.apiKey,
      },
      source: bulkEventsDto.apiKey,
      timestamp: new Date(evt.timestamp),
    }));

    const result = await this.eventModel.insertMany(docs);
    return { inserted: result.length };
  }

  async findAll(): Promise<Event[]> {
    return this.eventModel.find().sort({ timestamp: -1 }).exec();
  }

  async getWebsites(): Promise<{ url: string; lastSeen: Date }[]> {
    return this.eventModel.aggregate([
      { $match: { type: 'pageview' } },
      {
        $addFields: {
          origin: {
            $let: {
              vars: {
                fullUrl: { $ifNull: ['$payload.url', ''] },
              },
              in: {
                $arrayElemAt: [
                  {
                    $split: [
                      {
                        $arrayElemAt: [
                          { $split: ['$$fullUrl', '://'] },
                          1,
                        ],
                      },
                      '/',
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$origin',
          lastSeen: { $max: '$timestamp' },
        },
      },
      { $match: { _id: { $nin: [null, ''] } } },
      { $sort: { lastSeen: -1 } },
      { $project: { _id: 0, url: '$_id', lastSeen: 1 } },
    ]);
  }

  async getSessions(website: string) {
    const matchingSessions = await this.eventModel.aggregate([
      { $match: { type: 'pageview', 'payload.sessionId': { $exists: true } } },
      {
        $addFields: {
          origin: {
            $let: {
              vars: {
                fullUrl: { $ifNull: ['$payload.url', ''] },
              },
              in: {
                $arrayElemAt: [
                  {
                    $split: [
                      {
                        $arrayElemAt: [
                          { $split: ['$$fullUrl', '://'] },
                          1,
                        ],
                      },
                      '/',
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      { $match: { origin: website } },
      { $group: { _id: '$payload.sessionId' } },
    ]);

    const sessionIds = matchingSessions.map((s) => s._id);
    if (!sessionIds.length) return [];

    return this.eventModel.aggregate([
      { $match: { 'payload.sessionId': { $in: sessionIds } } },
      {
        $group: {
          _id: '$payload.sessionId',
          startedAt: { $min: '$timestamp' },
          lastEventAt: { $max: '$timestamp' },
          eventCount: { $sum: 1 },
          eventTypes: { $addToSet: '$type' },
        },
      },
      { $sort: { lastEventAt: -1 } },
      {
        $project: {
          _id: 0,
          sessionId: '$_id',
          startedAt: 1,
          lastEventAt: 1,
          eventCount: 1,
          eventTypes: 1,
        },
      },
    ]);
  }

  async getSessionInfo(sessionId: string) {
    return this.eventModel
      .find({
        'payload.sessionId': sessionId,
        type: { $nin: ['rrweb', 'rrweb_checkout'] },
      })
      .sort({ timestamp: 1 })
      .exec();
  }

  async getSessionReplay(sessionId: string) {
    return this.eventModel
      .find({
        'payload.sessionId': sessionId,
        type: { $in: ['rrweb', 'rrweb_checkout'] },
      })
      .sort({ timestamp: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const updated = await this.eventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<Event> {
    const deleted = await this.eventModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }
    return deleted;
  }
}
