import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccountType, NormalBalance } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ example: '120.01', description: 'Hesap Kodu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @ApiProperty({ example: 'Yurtiçi Alıcılar A.Ş.', description: 'Hesap Adı' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: AccountType, example: AccountType.ASSET })
  @IsEnum(AccountType)
  @IsNotEmpty()
  type: AccountType;

  @ApiProperty({ enum: NormalBalance, example: NormalBalance.DEBIT })
  @IsEnum(NormalBalance)
  @IsNotEmpty()
  normalBalance: NormalBalance;

  @ApiProperty({ required: false, example: '120', description: 'Üst hesap kodu' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  parentCode?: string;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @IsEnum(NormalBalance)
  @IsOptional()
  normalBalance?: NormalBalance;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  parentCode?: string;
}
