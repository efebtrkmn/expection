import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Sprint 2 Modülleri
import { AccountsModule } from './accounts/accounts.module';
import { JournalModule } from './journal/journal.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { WebSocketModule } from './websocket/websocket.module';
import { ReportsModule } from './reports/reports.module';

// Sprint 3 Modülleri
import { EInvoiceModule } from './e-invoice/e-invoice.module';
import { BankingModule } from './banking/banking.module';
import { MarketplaceModule } from './marketplace/marketplace.module';

// Sprint 4 Modülleri
import { MailModule } from './mail/mail.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { PaymentsModule } from './payments/payments.module';

// Sprint 5 Modülleri
import { AiModule } from './ai/ai.module';


@Module({
  imports: [
    // Konfigürasyon — tüm modüllerde erişilebilir
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting (auth endpoint'leri için özel kısıtlama)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
        {
          name: 'auth',
          ttl: 60 * 1000,          // 1 dakika
          limit: config.get<number>('AUTH_THROTTLE_LIMIT', 5),
        },
      ],
    }),

    // JWT — TenantMiddleware'in token parse edebilmesi için global
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      global: true,
    }),

    // Event-Driven Mimari (Fatura -> Stok / Yevmiye iletişimi için)
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      global: true,
    }),

    // Temel Sprint 1 modülleri
    PrismaModule,
    AuditLogModule,
    AuthModule,

    // Sprint 2 Modülleri
    AccountsModule,
    JournalModule,
    ProductsModule,
    InvoicesModule,
    WebSocketModule,
    ReportsModule,

    // Sprint 3 Modülleri
    ScheduleModule.forRoot(),
    EInvoiceModule,
    BankingModule,
    MarketplaceModule,

    // Sprint 4 Modülleri
    MailModule,
    ClientPortalModule,
    ReconciliationModule,
    PaymentsModule,

    // Sprint 5 Modülleri
    AiModule,
  ],
  providers: [
    // Global Guard zinciri: JwtAuth → Tenant → Roles
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {
  /**
   * TenantMiddleware'i tüm route'lara uygula.
   * Auth endpoint'lerinde JWT henüz yoktur; header/subdomain çözümlemesi devreye girer.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
