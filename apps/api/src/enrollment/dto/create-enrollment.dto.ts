import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum PaymentMethodType {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
}

class PaymentMethodDto {
  @ApiProperty({
    description: '결제 수단 타입',
    enum: PaymentMethodType,
    example: PaymentMethodType.CARD,
  })
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  @ApiPropertyOptional({
    description: '저장된 빌링키 또는 외부 결제 수단 식별자',
    example: 'billing_key_123',
  })
  @IsOptional()
  @IsString()
  billingKey?: string;
}

export class CreateEnrollmentDto {
  @ApiProperty({ description: '수업 ID' })
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @ApiPropertyOptional({
    description: '자녀 ID (자녀 대신 수강 신청 시)',
  })
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({
    description: '자동 결제 동의 여부',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoPay?: boolean;

  @ApiPropertyOptional({
    description: '결제 수단 정보',
    type: PaymentMethodDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMethodDto)
  paymentMethod?: PaymentMethodDto;
}
