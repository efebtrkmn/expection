import { 
  IsDateString, 
  IsEnum, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString, 
  IsUUID, 
  Min,
  ValidateNested, 
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';
import { JournalReferenceType, JournalStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLedgerLineDto {
  @ApiProperty({ description: 'Hesap ID (Account UUID)' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ required: false, description: 'Satır açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Borç Tutarı', minimum: 0 })
  @IsNumber()
  @Min(0)
  debit: number;

  @ApiProperty({ description: 'Alacak Tutarı', minimum: 0 })
  @IsNumber()
  @Min(0)
  credit: number;

  @ApiProperty({ required: false, default: 'TRY' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false, default: 1.0 })
  @IsNumber()
  @IsOptional()
  exchangeRate?: number;
}

export class CreateJournalDto {
  @ApiProperty({ description: 'Fiş Numarası' })
  @IsString()
  @IsNotEmpty()
  entryNumber: string;

  @ApiProperty({ description: 'Fiş Tarihi' })
  @IsDateString()
  @IsNotEmpty()
  entryDate: string | Date;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: JournalReferenceType, example: JournalReferenceType.MANUAL })
  @IsEnum(JournalReferenceType)
  referenceType: JournalReferenceType;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  referenceId?: string;

  @ApiProperty({ enum: JournalStatus, required: false, default: JournalStatus.DRAFT })
  @IsEnum(JournalStatus)
  @IsOptional()
  status?: JournalStatus;

  @ApiProperty({ type: [CreateLedgerLineDto], description: 'Muavin Satırları (Borç ve Alacak dengeli olmalı)' })
  @ValidateNested({ each: true })
  @Type(() => CreateLedgerLineDto)
  @ArrayMinSize(2, { message: 'Çift taraflı kayıt için en az 2 satır gereklidir' })
  lines: CreateLedgerLineDto[];
}
