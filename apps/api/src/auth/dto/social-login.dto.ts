import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SupportedViewRole } from '../../user/role-view.util';

enum SocialProvider {
  KAKAO = 'kakao',
}

export class SocialLoginDto {
  @ApiProperty({
    description: '소셜 로그인 제공자',
    enum: SocialProvider,
    example: SocialProvider.KAKAO,
  })
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @ApiProperty({
    description: '소셜 제공자 access token',
    example: 'kakao_access_token_here',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({
    description: '신규 가입 시 즉시 반영할 역할',
    enum: SupportedViewRole,
    example: SupportedViewRole.PARENT,
  })
  @IsOptional()
  @IsEnum(SupportedViewRole)
  role?: SupportedViewRole;
}
