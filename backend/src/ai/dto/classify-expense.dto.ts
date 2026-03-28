import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AiInputTypeDto {
  BANK_TX = 'BANK_TX',
  RECEIPT = 'RECEIPT',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
}

export class ClassifyExpenseDto {
  @ApiProperty({
    example: 'Kırtasiye A.Ş. Ofis Malzemesi Alımı - Kalem, Kağıt, Zımba',
    description: 'Sınıflandırılacak gider metni (OCR çıktısı veya banka açıklaması)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  inputText: string;

  @ApiProperty({ enum: AiInputTypeDto, default: AiInputTypeDto.MANUAL_ENTRY })
  @IsEnum(AiInputTypeDto)
  @IsOptional()
  inputType?: AiInputTypeDto;

  @ApiProperty({ description: 'Referans kaydı ID (bank_transaction.id vb.)', required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class ReviewClassificationDto {
  @ApiProperty({ description: 'Onaylanan veya düzeltilen hesap kodu', example: '770' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @ApiProperty({ description: 'Gözden geçirme notu', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
