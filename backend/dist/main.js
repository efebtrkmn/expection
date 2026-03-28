"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const request_sanitizer_interceptor_1 = require("./common/interceptors/request-sanitizer.interceptor");
const sql_injection_guard_1 = require("./common/guards/sql-injection.guard");
const helmet_1 = require("helmet");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });
    const configService = app.get(config_1.ConfigService);
    const logger = new common_1.Logger('Bootstrap');
    app.setGlobalPrefix('api/v1');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                scriptSrc: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalInterceptors(new request_sanitizer_interceptor_1.RequestSanitizerInterceptor());
    app.useGlobalGuards(new sql_injection_guard_1.SqlInjectionGuard());
    const corsOrigins = configService
        .get('CORS_ORIGINS', 'http://localhost:3001')
        .split(',')
        .map((o) => o.trim());
    app.enableCors({
        origin: corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Tenant-ID',
            'X-Request-ID',
        ],
        credentials: true,
    });
    if (configService.get('NODE_ENV') !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Expection API')
            .setDescription('Expection – Multi-Tenant SaaS Muhasebe Platformu REST API\n\n' +
            '### Kimlik Doğrulama\n' +
            '`POST /api/v1/auth/login` ile token alın, ardından `Authorization: Bearer <token>` header\'ı kullanın.\n\n' +
            '### Multi-Tenancy\n' +
            'Her istek için `X-Tenant-ID` header\'ı gönderin veya tenant subdomain\'i üzerinden erişin.')
            .setVersion('1.0')
            .setContact('Expection Destek', 'https://expection.app', 'destek@expection.app')
            .addBearerAuth()
            .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Tenant-ID' }, 'X-Tenant-ID')
            .addTag('Kimlik Doğrulama', 'Giriş, çıkış ve token yönetimi')
            .addTag('Kiracılar', 'Tenant yönetimi (SuperAdmin)')
            .addTag('Kullanıcılar', 'Kullanıcı CRUD işlemleri')
            .addTag('Cari Hesaplar', 'Müşteri ve tedarikçi yönetimi')
            .addTag('Faturalar', 'Fatura oluşturma ve yönetimi')
            .addTag('Hareketler', 'Kasa ve banka hareketleri')
            .addTag('Denetim', 'KVKK uyumlu audit logları')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                defaultModelsExpandDepth: 2,
            },
        });
        logger.log('Swagger UI: http://localhost:3000/api/docs');
    }
    const port = configService.get('PORT', 3000);
    await app.listen(port);
    logger.log(`🚀 Expection API çalışıyor → http://localhost:${port}/api/v1`);
    logger.log(`📄 Swagger UI          → http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map