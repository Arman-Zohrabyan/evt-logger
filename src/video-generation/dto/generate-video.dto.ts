import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateVideoDto {
  @ApiPropertyOptional({ example: 1400, description: 'Video width in pixels' })
  width?: number;

  @ApiPropertyOptional({ example: 900, description: 'Video height in pixels' })
  height?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Playback speed multiplier',
  })
  speed?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Skip inactive periods',
  })
  skipInactive?: boolean;

  @ApiPropertyOptional({ example: 15, description: 'Frames per second' })
  fps?: number;
}
