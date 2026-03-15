import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcademyDto {
  @ApiProperty({ description: '학원 이름', example: '루비 발레 스튜디오' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '학원 주소',
    example: '서울시 강남구 역삼동 123-45',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: '위도', example: 37.5012 })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: '경도', example: 127.0396 })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({
    description: '전화번호',
    example: '02-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '카테고리 목록',
    example: ['발레', '무용'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiPropertyOptional({
    description: '학원 설명',
    example: '15년 전통의 발레 전문 스튜디오입니다.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '셔틀 운영 여부',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasShuttle?: boolean;

  @ApiPropertyOptional({
    description: '주차 가능 여부',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: '최소 월 수업료',
    example: 150000,
  })
  @IsOptional()
  @IsNumber()
  monthlyFeeMin?: number;

  @ApiPropertyOptional({
    description: '최대 월 수업료',
    example: 300000,
  })
  @IsOptional()
  @IsNumber()
  monthlyFeeMax?: number;
}
