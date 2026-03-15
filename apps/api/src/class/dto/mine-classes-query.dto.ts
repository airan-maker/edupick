import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MineClassesQueryDto {
  @ApiPropertyOptional({
    description: '특정 학원 기준으로 내 반 목록 필터링',
  })
  @IsOptional()
  @IsUUID()
  academyId?: string;
}
