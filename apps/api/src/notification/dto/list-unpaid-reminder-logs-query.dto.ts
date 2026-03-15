import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum UnpaidReminderTrigger {
  ALL = 'all',
  MANUAL = 'manual',
  AUTO = 'auto',
}

export class ListUnpaidReminderLogsQueryDto {
  @ApiPropertyOptional({ description: '반 ID 필터' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({
    description: '발송 유형',
    enum: UnpaidReminderTrigger,
    default: UnpaidReminderTrigger.ALL,
  })
  @IsOptional()
  @IsEnum(UnpaidReminderTrigger)
  trigger?: UnpaidReminderTrigger = UnpaidReminderTrigger.ALL;

  @ApiPropertyOptional({ description: '검색어 (원생/보호자/반)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '조회 개수', default: 40, maximum: 100 })
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 40;
}
