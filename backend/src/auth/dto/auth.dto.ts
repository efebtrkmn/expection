import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'muhasebeci@demo.expection.app', description: 'Kullanıcı e-posta adresi' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Accountant@2024!', description: 'Kullanıcı şifresi' })
  @IsString()
  @IsNotEmpty({ message: 'Şifre boş bırakılamaz' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @MaxLength(128)
  password: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Kiracı UUID (opsiyonel — header veya subdomain ile de alınabilir)',
    required: false,
  })
  @IsUUID('4', { message: 'Geçerli bir UUID formatı giriniz' })
  tenantId?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Yenileme token\'ı' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mevcut şifre' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'Yeni şifre (en az 8 karakter, büyük/küçük harf + rakam içermeli)' })
  @IsString()
  @MinLength(8, { message: 'Yeni şifre en az 8 karakter olmalıdır' })
  @MaxLength(128)
  newPassword: string;
}
