import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListManagedStudentsQueryDto {
  @ApiPropertyOptional({ description: '학원 ID 필터' })
  @IsOptional()
  @IsUUID()
  academyId?: string;

  @ApiPropertyOptional({ description: '반 ID 필터' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({
    description: '수강 상태 필터',
    enum: EnrollmentStatus,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
