import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { SupportedViewRole } from '../../user/role-view.util';

export class RegisterDto {
  @ApiProperty({
    description: '가입 이메일',
    example: 'parent@edupick.kr',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '이름',
    example: '홍길동',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'edupick1234',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: '전화번호',
    example: '010-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: '신규 가입 시 반영할 View 역할',
    enum: SupportedViewRole,
    example: SupportedViewRole.PARENT,
  })
  @IsOptional()
  @IsEnum(SupportedViewRole)
  role?: SupportedViewRole;
}
