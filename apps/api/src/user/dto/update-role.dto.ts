import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SupportedViewRole } from '../role-view.util';

export class UpdateRoleDto {
  @ApiProperty({
    description: '사용자 View 역할',
    enum: SupportedViewRole,
    example: SupportedViewRole.PARENT,
  })
  @IsEnum(SupportedViewRole)
  role: SupportedViewRole;
}
