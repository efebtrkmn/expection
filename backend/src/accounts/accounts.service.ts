import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, tenantId },
    });
    if (!account) throw new NotFoundException('Hesap bulunamadı');
    return account;
  }

  async create(dto: CreateAccountDto, tenantId: string, userId: string, ip: string) {
    // Aynı kodlu hesap var mı kontrolü
    const existing = await this.prisma.account.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) throw new ConflictException('Bu hesap kodu zaten kullanımda');

    const account = await this.prisma.account.create({
      data: {
        ...dto,
        tenantId,
        isSystem: false, // Yeni açılan hesaplar sistem hesabı olamaz
      },
    });

    await this.auditLogService.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'account',
      entityId: account.id,
      newValues: account,
      ipAddress: ip,
    });

    return account;
  }

  async update(id: string, dto: UpdateAccountDto, tenantId: string, userId: string, ip: string) {
    const account = await this.findOne(id, tenantId);
    
    // Sistem hesapları kısıtlaması (Adı vb değiştirilebilir ama type vb değiştirilemez, gereksinime göre)
    // Basitlik için sadece şimdilik izin veriyoruz.

    const updated = await this.prisma.account.update({
      where: { id },
      data: dto,
    });

    await this.auditLogService.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'account',
      entityId: account.id,
      oldValues: account,
      newValues: updated,
      ipAddress: ip,
    });

    return updated;
  }

  async delete(id: string, tenantId: string, userId: string, ip: string) {
    const account = await this.findOne(id, tenantId);
    
    if (account.isSystem) {
      throw new ForbiddenException('Sistem hesapları silinemez.');
    }

    // Hareket görmüş hesap silinemez
    const hasTransactions = await this.prisma.ledgerLine.findFirst({
      where: { accountId: id, tenantId },
    });
    
    if (hasTransactions) {
      throw new ConflictException('Hareketi olan hesap silinemez. Lütfen önce hareketleri iptal edin veya hesabı pasife alın.');
    }

    await this.prisma.account.delete({ where: { id } });

    await this.auditLogService.logEntityChange({
      tenantId,
      userId,
      action: AuditAction.DELETE,
      entityType: 'account',
      entityId: account.id,
      oldValues: account,
      ipAddress: ip,
    });
  }
}
