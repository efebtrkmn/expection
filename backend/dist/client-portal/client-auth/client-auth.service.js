"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClientAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientAuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const mail_service_1 = require("../../mail/mail.service");
const config_1 = require("@nestjs/config");
const argon2 = require("argon2");
let ClientAuthService = ClientAuthService_1 = class ClientAuthService {
    constructor(prisma, jwtService, mailService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.config = config;
        this.logger = new common_1.Logger(ClientAuthService_1.name);
    }
    async register(dto) {
        const cari = await this.prisma.customerSupplier.findFirst({
            where: { id: dto.customerSupplierId, tenantId: dto.tenantId },
        });
        if (!cari) {
            throw new common_1.NotFoundException('Cari hesabınız bulunamadı. İşletme ile iletişime geçin.');
        }
        const existing = await this.prisma.clientUser.findUnique({
            where: { tenantId_email: { tenantId: dto.tenantId, email: dto.email } },
        });
        if (existing) {
            throw new common_1.ConflictException('Bu e-posta adresi ile zaten bir hesap oluşturulmuş.');
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
        const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
        const portalUrl = this.config.get('CLIENT_PORTAL_URL', 'https://portal.expection.com');
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
    async login(dto) {
        const clientUser = await this.prisma.clientUser.findUnique({
            where: { tenantId_email: { tenantId: dto.tenantId, email: dto.email } },
            include: { customerSupplier: { select: { name: true } } },
        });
        if (!clientUser || !clientUser.passwordHash) {
            throw new common_1.UnauthorizedException('E-posta veya şifre hatalı.');
        }
        if (!clientUser.isActive) {
            throw new common_1.UnauthorizedException('Hesabınız devre dışı. İşletme ile iletişime geçin.');
        }
        const passwordValid = await argon2.verify(clientUser.passwordHash, dto.password);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('E-posta veya şifre hatalı.');
        }
        await this.prisma.clientUser.update({
            where: { id: clientUser.id },
            data: { lastLoginAt: new Date() },
        });
        const payload = {
            sub: clientUser.id,
            tenantId: dto.tenantId,
            contactId: clientUser.customerSupplierId,
            email: dto.email,
            role: 'CLIENT',
        };
        const secret = this.config.get('JWT_CLIENT_SECRET') || this.config.get('JWT_SECRET');
        const token = this.jwtService.sign(payload, { secret, expiresIn: '7d' });
        return {
            accessToken: token,
            clientName: clientUser.customerSupplier?.name,
            email: clientUser.email,
        };
    }
};
exports.ClientAuthService = ClientAuthService;
exports.ClientAuthService = ClientAuthService = ClientAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService,
        config_1.ConfigService])
], ClientAuthService);
//# sourceMappingURL=client-auth.service.js.map