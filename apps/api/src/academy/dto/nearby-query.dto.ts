import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NearbyQueryDto {
  @ApiProperty({ description: '검색 중심 위도', example: 37.5172 })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ description: '검색 중심 경도', example: 127.0473 })
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({
    description: '검색 반경 (km, 기본 3km)',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({
    description: '카테고리 필터',
    example: '발레',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: '학원명/주소/과목 검색어',
    example: '서초 발레',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '대상 연령대 필터',
    example: '초등 1~3학년',
  })
  @IsOptional()
  @IsString()
  ageGroup?: string;

  @ApiPropertyOptional({
    description: '셔틀 유무 필터',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  shuttle?: boolean;

  @ApiPropertyOptional({
    description: '최소 월 수업료',
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMin?: number;

  @ApiPropertyOptional({
    description: '최대 월 수업료',
    example: 500000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMax?: number;

  @ApiPropertyOptional({
    description: '수업 시작 시간 이후 필터 (HH:mm)',
    example: '15:00',
  })
  @IsOptional()
  @IsString()
  timeAfter?: string;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ['distance', 'rating', 'price'],
    default: 'distance',
  })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'price'])
  sortBy?: 'distance' | 'rating' | 'price';

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '페이지당 결과 수',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
