import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CalendarQueryDto {
  @ApiPropertyOptional({
    description: '특정 자녀 ID로 필터링',
  })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({
    description: '조회 시작일',
    example: '2026-03-16',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '조회 종료일',
    example: '2026-03-22',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '캘린더 보기 모드',
    enum: ['week', 'month'],
    default: 'week',
  })
  @IsOptional()
  @IsEnum(['week', 'month'])
  @Type(() => String)
  view?: 'week' | 'month';
}
