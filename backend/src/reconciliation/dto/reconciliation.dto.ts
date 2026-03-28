import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendReconciliationDto {
  @ApiProperty({ description: 'Mutabakat gönderilecek cari hesap ID'si' })
  @IsString()
  @IsNotEmpty()
  customerSupplierId: string;
}

export class RespondReconciliationDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @ApiProperty({ description: 'Müşteri notu (isteğe bağlı)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
