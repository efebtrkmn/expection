import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankSyncService } from './bank-sync.service';

export class CreateBankAccountDto {
  bankName: string;
  accountNumber: string;
  iban: string;
  currency?: string;
  provider?: string;
  providerAccountId?: string;
}

@Injectable()
export class BankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: BankSyncService,
  ) {}

  async create(tenantId: string, dto: CreateBankAccountDto) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { tenantId, iban: dto.iban },
    });
    if (existing) throw new ConflictException('Bu IBAN zaten sistemde kayıtlı');

    return this.prisma.bankAccount.create({
      data: { ...dto, tenantId, currency: dto.currency || 'TRY' },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.bankAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactions(bankAccountId: string, tenantId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
    });
    if (!account) throw new NotFoundException('Banka hesabı bulunamadı');

    return this.prisma.bankTransaction.findMany({
      where: { bankAccountId },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async manualSync(bankAccountId: string, tenantId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId },
    });
    if (!account) throw new NotFoundException('Banka hesabı bulunamadı');

    return this.syncService.syncAccount(bankAccountId, tenantId, account.providerAccountId);
  }
}
