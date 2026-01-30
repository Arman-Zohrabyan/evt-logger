import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  type: string;

  @Prop({ type: Object, default: {} })
  payload: Record<string, any>;

  @Prop()
  source: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
