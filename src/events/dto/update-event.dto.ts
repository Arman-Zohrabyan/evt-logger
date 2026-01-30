import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'user.logout' })
  type?: string;

  @ApiPropertyOptional({ example: { reason: 'session_expired' } })
  payload?: Record<string, any>;

  @ApiPropertyOptional({ example: 'auth-service' })
  source?: string;

  @ApiPropertyOptional()
  timestamp?: Date;
}
