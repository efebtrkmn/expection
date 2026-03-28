import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ClientRegisterDto, ClientLoginDto } from './dto/client-login.dto';
import * as argon2 from 'argon2';

@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Müşteri self-service kayıt
   * CustomerSupplier kaydına bağlı olmalıdır (işletmenin carisi içinde kayıtlı)
   */
  async register(dto: ClientRegisterDto) {
    // Cari kayıt doğrulama
    const cari = await this.prisma.customerSupplier.findFirst({
      where: { id: dto.customerSupplierId, tenantId: dto.tenantId },
    });
    if (!cari) {
      throw new NotFoundException('Cari hesabınız bulunamadı. İşletme ile iletişime geçin.');
    }

    const existing = await this.prisma.clientUser.findUnique({
      where: { tenantId_email: { tenantId: dto.tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('Bu e-posta adresi ile zaten bir hesap oluşturulmuş.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const clientUser = await this.prisma.clientUser.create({
      data: {
        tenantId: dto.tenantId,
        customerSupplierId: dto.customerSupplierId,
        email: dto.email,
        passwordHash,
      },
    });

    // Tenant bilgisi
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });

    // Hoşgeldin e-postası
    const portalUrl = this.config.get<string>('CLIENT_PORTAL_URL', 'https://portal.expection.com');
    await this.mailService.sendClientWelcome(dto.email, {
      customerName: cari.name,
      tenantName: tenant?.name || 'İşletmeniz',
      portalUrl,
    });

    this.logger.log(`Yeni Müşteri Kaydı: ${dto.email} (Tenant: ${dto.tenantId})`);

    return {
      message: 'Kayıt başarılı. Hoşgeldiniz e-postanızı kontrol edin.',
      clientUserId: clientUser.id,
    };
  }

  /**
   * Müşteri girişi — role: CLIENT JWT üretir
   */
  async login(dto: ClientLoginDto) {
    const clientUser = await this.prisma.clientUser.findUnique({
      where: { tenantId_email: { tenantId: dto.tenantId, email: dto.email } },
      include: { customerSupplier: { select: { name: true } } },
    });

    if (!clientUser || !clientUser.passwordHash) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    if (!clientUser.isActive) {
      throw new UnauthorizedException('Hesabınız devre dışı. İşletme ile iletişime geçin.');
    }

    const passwordValid = await argon2.verify(clientUser.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    await this.prisma.clientUser.update({
      where: { id: clientUser.id },
      data: { lastLoginAt: new Date() },
    });

    // JWT: role: CLIENT — JwtAuthGuard tarafında ayrı işlenir
    const payload = {
      sub: clientUser.id,
      tenantId: dto.tenantId,
      contactId: clientUser.customerSupplierId,
      email: dto.email,
      role: 'CLIENT',
    };

    const secret = this.config.get<string>('JWT_CLIENT_SECRET') || this.config.get<string>('JWT_SECRET');
    const token = this.jwtService.sign(payload, { secret, expiresIn: '7d' });

    return {
      accessToken: token,
      clientName: clientUser.customerSupplier?.name,
      email: clientUser.email,
    };
  }
}
