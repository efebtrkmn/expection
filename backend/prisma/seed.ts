import { PrismaClient, UserRole, TenantStatus, TenantPlan } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Demo Tenant 1: Primary Muhasebe Firması ─────────────────────
  const tenant1 = await prisma.tenant.upsert({
    where: { domain: 'demo.expection.app' },
    update: {},
    create: {
      name: 'Demo Muhasebe A.Ş.',
      domain: 'demo.expection.app',
      plan: TenantPlan.PROFESSIONAL,
      status: TenantStatus.ACTIVE,
      taxNumber: '1234567890',
    },
  });
  console.log(`✅ Tenant 1 oluşturuldu: ${tenant1.name}`);

  // ── Demo Tenant 2: Test Kiracısı ────────────────────────────────
  const tenant2 = await prisma.tenant.upsert({
    where: { domain: 'test.expection.app' },
    update: {},
    create: {
      name: 'Test Şirketi Ltd.',
      domain: 'test.expection.app',
      plan: TenantPlan.STARTER,
      status: TenantStatus.TRIAL,
    },
  });
  console.log(`✅ Tenant 2 oluşturuldu: ${tenant2.name}`);

  // ── Şifre hash'leme ─────────────────────────────────────────────
  const superAdminPass = await argon2.hash('SuperAdmin@2024!', { type: argon2.argon2id });
  const accountantPass = await argon2.hash('Accountant@2024!', { type: argon2.argon2id });
  const auditorPass    = await argon2.hash('Auditor@2024!', { type: argon2.argon2id });
  const clientPass     = await argon2.hash('Client@2024!', { type: argon2.argon2id });

  // ── Kullanıcılar — Tenant 1 ─────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant1.id, email: 'superadmin@expection.app' } },
    update: {},
    create: {
      tenantId:     tenant1.id,
      email:        'superadmin@expection.app',
      passwordHash: superAdminPass,
      role:         UserRole.SuperAdmin,
      fullName:     'Platform Yöneticisi',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant1.id, email: 'muhasebeci@demo.expection.app' } },
    update: {},
    create: {
      tenantId:     tenant1.id,
      email:        'muhasebeci@demo.expection.app',
      passwordHash: accountantPass,
      role:         UserRole.Accountant,
      fullName:     'Ayşe Yılmaz',
    },
  });

  const auditor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant1.id, email: 'musavir@demo.expection.app' } },
    update: {},
    create: {
      tenantId:     tenant1.id,
      email:        'musavir@demo.expection.app',
      passwordHash: auditorPass,
      role:         UserRole.Auditor,
      fullName:     'Mehmet Kaya',
    },
  });

  console.log(`✅ Kullanıcılar oluşturuldu: ${superAdmin.email}, ${accountant.email}, ${auditor.email}`);

  // ── Demo Müşteri ─────────────────────────────────────────────────
  const demoCustomer = await prisma.customerSupplier.upsert({
    where: { tenantId_taxNumber: { tenantId: tenant1.id, taxNumber: '9876543210' } },
    update: {},
    create: {
      tenantId:  tenant1.id,
      type:      'CUSTOMER',
      name:      'Örnek Müşteri A.Ş.',
      taxNumber: '9876543210',
      taxOffice: 'Büyük Mükellefler',
      city:      'İstanbul',
      phone:     '+902121234567',
      email:     'info@ornekmusteri.com.tr',
    },
  });

  // ── ClientUser ────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant1.id, email: 'musteri@ornekmusteri.com.tr' } },
    update: {},
    create: {
      tenantId:     tenant1.id,
      email:        'musteri@ornekmusteri.com.tr',
      passwordHash: clientPass,
      role:         UserRole.ClientUser,
      fullName:     'Müşteri Kullanıcısı',
      customerId:   demoCustomer.id,
    },
  });

  console.log(`✅ Demo müşteri ve ClientUser oluşturuldu`);
  console.log('\n🎉 Seed tamamlandı!');
  console.log('\n📋 Demo Giriş Bilgileri:');
  console.log('  SuperAdmin:  superadmin@expection.app  / SuperAdmin@2024!');
  console.log('  Accountant:  muhasebeci@demo...        / Accountant@2024!');
  console.log('  Auditor:     musavir@demo...            / Auditor@2024!');
  console.log('  ClientUser:  musteri@ornekmusteri...    / Client@2024!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
