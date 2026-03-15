import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

class ScheduleDto {
  @ApiProperty({
    description: '요일',
    enum: DayOfWeek,
    example: 'MON',
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: '시작 시간', example: '15:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: '종료 시간', example: '16:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;
}

export class CreateClassDto {
  @ApiProperty({ description: '학원 ID' })
  @IsUUID()
  academyId: string;

  @ApiPropertyOptional({ description: '강사 ID' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiProperty({ description: '수업 이름', example: '초등 발레 기초반' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '과목', example: '발레' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({
    description: '대상 연령대',
    example: '초등 1~3학년',
  })
  @IsOptional()
  @IsString()
  ageGroup?: string;

  @ApiProperty({ description: '최대 정원', example: 15 })
  @IsNumber()
  maxStudents: number;

  @ApiProperty({ description: '월 수업료 (원)', example: 200000 })
  @IsNumber()
  monthlyFee: number;

  @ApiPropertyOptional({
    description: '수업 스케줄 목록',
    type: [ScheduleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules?: ScheduleDto[];
}
