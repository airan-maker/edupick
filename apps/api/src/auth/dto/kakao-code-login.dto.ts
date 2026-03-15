import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { SupportedViewRole } from '../../user/role-view.util';

export class KakaoCodeLoginDto {
  @ApiProperty({
    description: '카카오 OAuth authorization code',
    example: 'SplxlOBeZQQYbYS6WxSbIA',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '카카오 로그인 콜백 redirect URI',
    example: 'http://localhost:3000/kakao/callback',
  })
  @IsString()
  @IsUrl({ require_tld: false })
  redirectUri: string;

  @ApiPropertyOptional({
    description: '신규 가입 시 반영할 View 역할',
    enum: SupportedViewRole,
    example: SupportedViewRole.INSTRUCTOR,
  })
  @IsOptional()
  @IsEnum(SupportedViewRole)
  role?: SupportedViewRole;
}
