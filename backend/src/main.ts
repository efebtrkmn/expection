import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RequestSanitizerInterceptor } from './common/interceptors/request-sanitizer.interceptor';
import { SqlInjectionGuard } from './common/guards/sql-injection.guard';
import helmet from 'helmet';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Global Prefix ────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Güvenlik: Helmet HTTP Headers ───────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Swagger UI için
  }));

  // ── Global Validation Pipe (whitelist + transform) ───────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global XSS Sanitizer + SQL Injection Guard ───────────────
  app.useGlobalInterceptors(new RequestSanitizerInterceptor());
  app.useGlobalGuards(new SqlInjectionGuard());

  // ── CORS ──────────────────────────────────────────────────────
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3001')
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

  // ── Swagger / OpenAPI Dokümantasyonu ─────────────────────────
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Expection API')
      .setDescription(
        'Expection – Multi-Tenant SaaS Muhasebe Platformu REST API\n\n' +
        '### Kimlik Doğrulama\n' +
        '`POST /api/v1/auth/login` ile token alın, ardından `Authorization: Bearer <token>` header\'ı kullanın.\n\n' +
        '### Multi-Tenancy\n' +
        'Her istek için `X-Tenant-ID` header\'ı gönderin veya tenant subdomain\'i üzerinden erişin.',
      )
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

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: 2,
      },
    });
    logger.log('Swagger UI: http://localhost:3000/api/docs');
  }

  // ── Server Başlatma ───────────────────────────────────────────
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`🚀 Expection API çalışıyor → http://localhost:${port}/api/v1`);
  logger.log(`📄 Swagger UI          → http://localhost:${port}/api/docs`);
}

bootstrap();
