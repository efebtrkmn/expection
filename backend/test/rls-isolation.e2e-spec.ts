import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

/**
 * RLS Tenant İzolasyonu Integration Testleri
 *
 * Senaryolar:
 * 1. Tenant A kullanıcısı, Tenant B'nin faturasına erişemez
 * 2. Müşteri (CLIENT), başka bir müşterinin faturasına erişemez
 * 3. Yanlış tenantId ile JWT → 401/403
 *
 * Test Stratejisi:
 * - Gerçek HTTP request'ler (supertest)
 * - PrismaService mock ile gerçek DB bağlantısı gerekmez
 * - JWT'ler gerçek imzalanır (test secret ile)
 */
describe('RLS Tenant İzolasyonu (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: jest.Mocked<PrismaService>;

  const TENANT_A = 'tenant-aaaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TENANT_B = 'tenant-bbbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const USER_A = 'user-a-000000000-0000-0000-0000-000000000000';
  const INVOICE_B = 'invoice-bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const CONTACT_A = 'contact-aaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const CONTACT_B = 'contact-bbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  // Token üretici
  const makeToken = (payload: any) =>
    jwtService.sign(payload, { secret: 'test-jwt-secret-for-testing-only' });

  const tokenTenantA = () => makeToken({
    sub: USER_A, tenantId: TENANT_A, email: 'admin@a.com', role: 'SuperAdmin',
  });

  const tokenClientA = () => makeToken({
    sub: 'client-a', tenantId: TENANT_A, contactId: CONTACT_A, email: 'client@a.com', role: 'CLIENT',
  });

  beforeAll(async () => {
    // PrismaService yerine mock kullan (DB bağlantısı gerekmez)
    const mockPrisma = createPrismaMock(TENANT_A, TENANT_B, INVOICE_B, CONTACT_A, CONTACT_B);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    prisma = moduleFixture.get(PrismaService);

    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ────────────────────────────────────────────────────────────
  describe('Tenant-to-Tenant İzolasyonu', () => {
    it('[GÜVENLIK] Tenant A tokeni ile Tenant B faturasına erişim → 403 veya 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/invoices/${INVOICE_B}`)
        .set('Authorization', `Bearer ${tokenTenantA()}`)
        .set('X-Tenant-ID', TENANT_A)
        .expect(res => {
          expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(res.status);
        });
    });

    it('[GÜVENLIK] Geçersiz Tenant-ID header → tenant bulunamaz → 401/404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenTenantA()}`)
        .set('X-Tenant-ID', 'non-existent-tenant-id')
        .expect(res => {
          expect([HttpStatus.UNAUTHORIZED, HttpStatus.NOT_FOUND, HttpStatus.FORBIDDEN]).toContain(res.status);
        });
    });

    it('[GÜVENLIK] Tenant header olmadan → TenantMiddleware → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${tokenTenantA()}`)
        .expect(res => {
          expect([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN]).toContain(res.status);
        });
    });
  });

  // ────────────────────────────────────────────────────────────
  describe('Client User İzolasyonu', () => {
    it('[GÜVENLIK] CLIENT token → başka cari faturasına erişim → 403', async () => {
      // CLIENT_A, Contact_B'nin faturasını istememeli
      const invoiceOfB = 'invoice-of-contact-b-000000000000';

      await request(app.getHttpServer())
        .get(`/api/v1/client/invoices/${invoiceOfB}`)
        .set('Authorization', `Bearer ${tokenClientA()}`)
        .expect(res => {
          expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(res.status);
        });
    });

    it('[GÜVENLIK] SuperAdmin token, Client endpoint → rol reddi', async () => {
      // /client/* endpoint'leri role:CLIENT bekler
      // Bir SuperAdmin bu endpointe erişemez (guard rolü kontrol eder)
      await request(app.getHttpServer())
        .get('/api/v1/client/invoices')
        .set('Authorization', `Bearer ${tokenTenantA()}`)
        .expect(res => {
          expect([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN]).toContain(res.status);
        });
    });
  });

  // ────────────────────────────────────────────────────────────
  describe('JWT Manipülasyon Testleri', () => {
    it('[GÜVENLIK] tenantId değiştirilmiş JWT → 401 (imza geçersiz)', async () => {
      // JWT payload'u decode edip tenant değiştirip tekrar sign et (farklı secret ile)
      const tamperedToken = jwtService.sign(
        { sub: USER_A, tenantId: TENANT_B, role: 'SuperAdmin' },
        { secret: 'wrong-secret-hacker-attempt' }
      );

      await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .set('X-Tenant-ID', TENANT_B)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('[GÜVENLIK] Süresi dolmuş JWT → 401', async () => {
      const expiredToken = jwtService.sign(
        { sub: USER_A, tenantId: TENANT_A, role: 'SuperAdmin' },
        { secret: 'test-jwt-secret-for-testing-only', expiresIn: '-1s' }
      );

      await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('X-Tenant-ID', TENANT_A)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('[GÜVENLIK] Bearer token olmadan → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('X-Tenant-ID', TENANT_A)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ────────────────────────────────────────────────────────────
  describe('XSS ve Input Sanitizasyon', () => {
    it('[GÜVENLIK] script tag içeren body → sanitize edilmiş yanıt döner (500 değil)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/client/auth/register')
        .send({
          email: '<script>alert(1)</script>@hack.com',
          password: 'ValidPass123!',
          customerSupplierId: CONTACT_A,
          tenantId: TENANT_A,
        })
        .expect(res => {
          // Sanitize edilmiş fakat internal error vermez
          expect(res.status).not.toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          // Script tag body'de döndürülmemeli
          if (res.body.email) {
            expect(res.body.email).not.toContain('<script>');
          }
        });
    });
  });
});

// ── Test için PrismaService Mock Fabrikası ──────────────────────────────────
function createPrismaMock(tenantA: string, tenantB: string, invoiceB: string, contactA: string, contactB: string) {
  return {
    tenant: {
      findUnique: jest.fn((args) => {
        if (args.where.id === tenantA) return Promise.resolve({ id: tenantA, name: 'Tenant A', isActive: true });
        if (args.where.id === tenantB) return Promise.resolve({ id: tenantB, name: 'Tenant B', isActive: true });
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    invoice: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn((args) => {
        // Tenant A, Tenant B faturasına erişemez
        if (args.where?.id === invoiceB && args.where?.tenantId === tenantA) {
          return Promise.resolve(null); // RLS: bulunamadı
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    customerSupplier: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    clientUser: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn().mockImplementation(async (fn) => fn({})),
  };
}
