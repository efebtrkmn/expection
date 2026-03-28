import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsNumber, Min, MaxLength, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductUnit } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'STK-001', description: 'Benzersiz Stok Kodu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'iPhone 15 Pro Max', description: 'Stok Adı / Hizmet Tanımı' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.ADET })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ example: 45000.00, description: 'Birim Fiyat' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;

  @ApiProperty({ example: 20, description: 'KDV Oranı (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  taxRate: number;

  @ApiProperty({ example: 100, description: 'Varsayılan Başlangıç Stoğu (Opsiyonel)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockQuantity?: number;

  @ApiProperty({ example: 5, description: 'Kritik Stok Uyarı Seviyesi' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  criticalStockLevel?: number;

  @ApiProperty({ default: true, description: 'Stok miktarı fatura kesildikçe düşsün mü?' })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiProperty({ example: '600', description: 'Yurtiçi Satış Hesabı Kodu', default: '600' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  salesAccountCode?: string;

  @ApiProperty({ example: '620', description: 'SMM (Satılan Mal Maliyeti) Hesap Kodu', default: '620' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cogsAccountCode?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  criticalStockLevel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
