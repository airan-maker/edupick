import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class SendUnpaidReminderDto {
  @ApiProperty({
    description: '미납 알림을 발송할 결제 ID 목록',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  paymentIds: string[];
}
