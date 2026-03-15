import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Max, Min } from 'class-validator';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지 크기', default: 30, maximum: 100 })
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 30;

  @ApiPropertyOptional({
    description: '읽음 여부 필터',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
