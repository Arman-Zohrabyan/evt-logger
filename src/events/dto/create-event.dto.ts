import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: 'user.login', description: 'Event type identifier' })
  type: string;

  @ApiPropertyOptional({
    example: { userId: 'abc123' },
    description: 'Arbitrary event data',
  })
  payload?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'auth-service',
    description: 'Origin of the event',
  })
  source?: string;

  @ApiPropertyOptional({
    description: 'When the event occurred (defaults to now)',
  })
  timestamp?: Date;
}
