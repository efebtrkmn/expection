import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EInvoiceWebhookDto {
  @ApiProperty({ description: 'Fatura UUID (GİB tarafından atanan)' })
  @IsString()
  @IsNotEmpty()
  invoiceUUID: string;

  @ApiProperty({ description: 'GİB durum kodu', enum: ['PENDING', 'IN_PROGRESS', 'ACCEPTED', 'REJECTED', 'CANCELLED'] })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'GİB sonuç kodu (örn: 1300, 1220)', required: false })
  @IsOptional()
  @IsString()
  gibCode?: string;

  @ApiProperty({ description: 'GİB açıklama mesajı', required: false })
  @IsOptional()
  @IsString()
  gibMessage?: string;

  @ApiProperty({ description: 'Entegratör referans numarası', required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
