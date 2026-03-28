import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClientRegisterDto {
  @ApiProperty({ example: 'musteri@firma.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'GüçlüŞifre123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Müşterinin cari kaydı (CustomerSupplier) ID\'si' })
  @IsString()
  @IsNotEmpty()
  customerSupplierId: string;

  @ApiProperty({ description: 'Tenant kimliği (subdomain veya domain üzerinden belirlenir)' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class ClientLoginDto {
  @ApiProperty({ example: 'musteri@firma.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Tenant kimliği' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
