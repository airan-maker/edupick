import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum OperatorStatisticsRange {
  YEAR = 'year',
  LAST_6_MONTHS = 'last_6_months',
  LAST_30_DAYS = 'last_30_days',
}

export class OperatorStatisticsQueryDto {
  @ApiPropertyOptional({
    description: '조회 기간 프리셋',
    enum: OperatorStatisticsRange,
    default: OperatorStatisticsRange.YEAR,
  })
  @IsOptional()
  @IsEnum(OperatorStatisticsRange)
  range?: OperatorStatisticsRange = OperatorStatisticsRange.YEAR;

  @ApiPropertyOptional({ description: '조회 연도', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(3000)
  year?: number;
}
