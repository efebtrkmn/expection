import { PrismaClient, AccountType, NormalBalance } from '@prisma/client';

const prisma = new PrismaClient();

const THP_SEED = [
  { code: '100', name: 'Kasa', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isSystem: true },
  { code: '102', name: 'Bankalar', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isSystem: true },
  { code: '120', name: 'Alıcılar', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isSystem: true },
  { code: '153', name: 'Ticari Mallar', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isSystem: true },
  { code: '191', name: 'İndirilecek KDV', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isSystem: true },
  { code: '320', name: 'Satıcılar', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isSystem: true },
  { code: '391', name: 'Hesaplanan KDV', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isSystem: true },
  { code: '500', name: 'Sermaye', type: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT, isSystem: true },
  { code: '600', name: 'Yurtiçi Satışlar', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT, isSystem: true },
  { code: '620', name: 'Satılan Mamuller Maliyeti', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isSystem: true },
  { code: '770', name: 'Genel Yönetim Giderleri', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT, isSystem: true },
];

export async function seedTHPForTenant(tenantId: string) {
  console.log(`Pumping THP (Tekdüzen Hesap Planı) for tenant ${tenantId}...`);
  
  for (const account of THP_SEED) {
    await prisma.account.upsert({
      where: {
        tenantId_code: { tenantId, code: account.code }
      },
      update: {},
      create: {
        ...account,
        tenantId
      }
    });
  }
}

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  if (tenants.length === 0) {
    console.log('Sistemde hiç aktif kiracı yok, önce seed.ts çalıştırın.');
    return;
  }

  for (const t of tenants) {
    await seedTHPForTenant(t.id);
  }
  
  console.log('🎉 THP başarıyla tüm kiracılar için eklendi!');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
