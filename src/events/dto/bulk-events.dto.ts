import { ApiProperty } from '@nestjs/swagger';

class TrackerEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  timestamp: number;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  data: any;
}

export class BulkEventsDto {
  @ApiProperty()
  apiKey: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [TrackerEventDto] })
  events: TrackerEventDto[];
}
