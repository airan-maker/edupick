import {
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

enum ClassStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
}

class ScheduleDto {
  @ApiPropertyOptional({ description: '요일', enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiPropertyOptional({ description: '시작 시간', example: '15:00' })
  @IsString()
  startTime: string;

  @ApiPropertyOptional({ description: '종료 시간', example: '16:00' })
  @IsString()
  endTime: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ description: '강사 ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiPropertyOptional({ description: '수업 이름' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '과목' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: '대상 연령대' })
  @IsOptional()
  @IsString()
  ageGroup?: string;

  @ApiPropertyOptional({ description: '최대 정원' })
  @IsOptional()
  @IsNumber()
  maxStudents?: number;

  @ApiPropertyOptional({ description: '월 수업료 (원)' })
  @IsOptional()
  @IsNumber()
  monthlyFee?: number;

  @ApiPropertyOptional({
    description: '수업 상태',
    enum: ClassStatus,
  })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @ApiPropertyOptional({
    description: '수업 스케줄 (전체 교체)',
    type: [ScheduleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules?: ScheduleDto[];
}
