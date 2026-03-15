import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildDto {
  @ApiProperty({ description: '자녀 이름', example: '김민수' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: '생년월일',
    example: '2015-03-15',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: '학교 이름', example: '서울초등학교' })
  @IsOptional()
  @IsString()
  schoolName?: string;

  @ApiPropertyOptional({
    description: '학교 주소',
    example: '서울시 강남구 테헤란로 123',
  })
  @IsOptional()
  @IsString()
  schoolAddress?: string;

  @ApiPropertyOptional({ description: '학교 위도', example: 37.5012 })
  @IsOptional()
  @IsNumber()
  schoolLat?: number;

  @ApiPropertyOptional({ description: '학교 경도', example: 127.0396 })
  @IsOptional()
  @IsNumber()
  schoolLng?: number;

  @ApiPropertyOptional({ description: '학년', example: '초3' })
  @IsOptional()
  @IsString()
  grade?: string;
}
