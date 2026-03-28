import { 
  IsEnum, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString, 
  Max, 
  MaxLength, 
  Min 
} from 'class-validator';
import { ProductUnit } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'PRD-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Premium Danışmanlık Hizmeti' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProductUnit, default: ProductUnit.SAAT })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 20, description: 'KDV Oranı (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate: number;

  @ApiProperty({ example: 10, required: false, description: 'Stok miktar kontrol eşiği' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  criticalStockLevel?: number;

  @ApiProperty({ default: true, description: 'Hizmetler için false yapılabilir' })
  @IsOptional()
  trackStock?: boolean;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRate?: number;
}
