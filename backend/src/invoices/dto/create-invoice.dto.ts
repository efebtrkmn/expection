import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString, IsNumber, Min, Max, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceType, ProductUnit } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({ description: 'Kayıtlı ürün ise IDsi (Yoksa serbest metin satırıdır)', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: 'Hizmet veya Ürün Açıklaması' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Miktar', example: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ enum: ProductUnit, default: ProductUnit.ADET })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ description: 'Birim Fiyat' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'İskonto Oranı (%)', default: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountRate?: number;

  @ApiProperty({ description: 'KDV Oranı (%)', default: 20, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiProperty({ description: 'KDV Tevkifatı Oranı (Örn: 9/10 için 90, 5/10 için 50)', default: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  withholdingRate?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Müşteri / Tedarikçi (Cari) ID' })
  @IsString()
  @IsNotEmpty()
  customerSupplierId: string;

  @ApiProperty({ description: 'Fatura Numarası (Örn: GIB2024000000001)' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ enum: InvoiceType, example: InvoiceType.SALES })
  @IsEnum(InvoiceType)
  type: InvoiceType;

  @ApiProperty({ description: 'Fatura Düzenleme Tarihi', example: '2024-03-28' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Vade Tarihi', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Para Birimi', default: 'TRY', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Döviz Kuru (TRY için 1.00)', default: 1.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  exchangeRate?: number;

  @ApiProperty({ description: 'Fatura Notları', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Fatura Kalemleri', type: [InvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Fatura en az 1 kalem içermelidir' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
