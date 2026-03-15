import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateManagedEnrollmentDto {
  @ApiPropertyOptional({
    description: '수강 상태',
    enum: EnrollmentStatus,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    description: '자동 결제 사용 여부',
  })
  @IsOptional()
  @IsBoolean()
  autoPayEnabled?: boolean;

  @ApiPropertyOptional({
    description: '운영 메모',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}
