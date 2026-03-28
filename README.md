# Expection — Multi-Tenant SaaS Muhasebe Platformu

> B2B/B2C işletmelerin iç ön muhasebesini yöneten, GİB e-Fatura UBL-TR ve KVKK uyumlu modern SaaS platformu.

[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-5-blue)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

---

## Mimari

- **Multi-tenancy**: Pool Model — tüm kiracılar aynı DB, `tenant_id` + PostgreSQL RLS ile izolasyon
- **Auth**: JWT (15dk) + Refresh Token rotasyonu (7 gün), argon2id şifreleme
- **RBAC**: SuperAdmin / Accountant / Auditor / ClientUser
- **KVKK**: Append-only `audit_logs` tablosu (DB seviyesinde UPDATE/DELETE yasak)

## Proje Yapısı

```
expection/
└── backend/
    ├── prisma/
    │   ├── schema.prisma          # Tüm DB modelleri (8 tablo)
    │   ├── migrations/
    │   │   └── 001_rls_setup.sql  # RLS politikaları ve güvenlik
    │   └── seed.ts                # Demo veri
    └── src/
        ├── main.ts                # Uygulama giriş noktası
        ├── app.module.ts          # Kök modül (global guard zinciri)
        ├── prisma/                # Tenant-aware PrismaService
        ├── auth/                  # JWT auth, login/logout/refresh
        ├── audit-log/             # KVKK denetim log servisi
        └── common/
            ├── decorators/        # @CurrentUser, @CurrentTenant, @Roles, @Public
            ├── guards/            # JwtAuthGuard, TenantGuard, RolesGuard
            └── middleware/        # TenantMiddleware (tenant_id çözümleme)
```

## Kurulum

### Gereksinimler

- Node.js >= 20
- PostgreSQL >= 14
- npm >= 10

### 1. Bağımlılıkları Yükle

```bash
cd backend
npm install
```

### 2. Ortam Değişkenlerini Ayarla

```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

**Kritik değişkenler:**
```env
DATABASE_URL="postgresql://expection_app:ŞIFRE@localhost:5432/expection_db"
JWT_SECRET="en-az-64-karakter-rastgele-string"
```

### 3. Veritabanı Oluştur

```bash
# PostgreSQL'e bağlan ve DB oluştur
psql -U postgres -c "CREATE DATABASE expection_db;"
psql -U postgres -c "CREATE USER expection_app WITH PASSWORD 'ŞIFRE';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE expection_db TO expection_app;"
```

### 4. Prisma Migration

```bash
npm run prisma:migrate
# Prisma Client'ı oluştur
npm run prisma:generate
```

### 5. RLS Politikalarını Uygula

```bash
# Süper kullanıcı bağlantısı ile çalıştır
psql postgresql://postgres:ADMIN_ŞIFRE@localhost:5432/expection_db \
  -f prisma/migrations/001_rls_setup.sql
```

### 6. Demo Veri Yükle (Opsiyonel)

```bash
npm run prisma:seed
```

Demo hesaplar:
| Rol | E-posta | Şifre |
|-----|---------|-------|
| SuperAdmin | superadmin@expection.app | SuperAdmin@2024! |
| Accountant | muhasebeci@demo.expection.app | Accountant@2024! |
| Auditor | musavir@demo.expection.app | Auditor@2024! |
| ClientUser | musteri@ornekmusteri.com.tr | Client@2024! |

### 7. Çalıştır

```bash
# Geliştirme modu (hot-reload)
npm run start:dev

# Prodüksiyon
npm run build && npm run start:prod
```

**API:** `http://localhost:3000/api/v1`  
**Swagger UI:** `http://localhost:3000/api/docs`

---

## API Uç Noktaları (Sprint 1)

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| POST | `/api/v1/auth/login` | Giriş | Public |
| POST | `/api/v1/auth/refresh` | Token yenile | Public |
| POST | `/api/v1/auth/logout` | Çıkış | Auth |
| POST | `/api/v1/auth/logout-all` | Tüm oturumları kapat | Auth |
| GET | `/api/v1/auth/me` | Profil bilgisi | Auth |
| POST | `/api/v1/auth/change-password` | Şifre değiştir | Auth |

## Güvenlik

- Şifreler **argon2id** ile hash'lenir (64MB bellek, 3 iterasyon)
- Refresh token'lar DB'de **SHA-256 hash** olarak saklanır
- Her request'te **PostgreSQL RLS** ile tenant izolasyonu sağlanır
- Tüm giriş/çıkış ve veri değişiklikleri **audit_logs** tablosuna yazılır
- Audit logları **DB seviyesinde immutable** (UPDATE/DELETE kısıtlı)
- Auth endpoint'leri **rate limit** ile korunur (5 req/dk)

## Sprint Planı

- [x] Sprint 1 — Altyapı, DB İzolasyonu, RBAC Auth
- [ ] Sprint 2 — Müşteri/Tedarikçi Yönetimi + Fatura CRUD
- [ ] Sprint 3 — e-Fatura GİB Entegrasyonu (UBL-TR)
- [ ] Sprint 4 — Ödeme: Iyzico Marketplace API
- [ ] Sprint 5 — Raporlama (Ba/Bs, KDV)
- [ ] Sprint 6 — Müşteri Portalı (Frontend)
