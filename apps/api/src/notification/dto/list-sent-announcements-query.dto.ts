import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListSentAnnouncementsQueryDto {
  @ApiPropertyOptional({ description: '반 ID 필터' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: '조회 개수', default: 12, maximum: 30 })
  @IsOptional()
  @Min(1)
  @Max(30)
  limit?: number = 12;
}
