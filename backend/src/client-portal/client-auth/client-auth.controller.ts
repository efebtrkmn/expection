import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientAuthService } from './client-auth.service';
import { ClientRegisterDto, ClientLoginDto } from './dto/client-login.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Müşteri Portalı — Kimlik Doğrulama')
@Public()
@Controller('client/auth')
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Müşteri Self-Service Kayıt (Cari hesabına bağlı)' })
  register(@Body() dto: ClientRegisterDto) {
    return this.clientAuthService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Müşteri Girişi — role:CLIENT JWT döndürür' })
  login(@Body() dto: ClientLoginDto) {
    return this.clientAuthService.login(dto);
  }
}
