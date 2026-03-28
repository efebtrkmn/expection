import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Marketplace } from '@prisma/client';
import { MarketplaceSyncService } from './marketplace-sync.service';
import * as crypto from 'crypto';

export class CreateConnectionDto {
  marketplace: Marketplace;
  sellerId: string;
  apiKey: string;
  apiSecret?: string;
  extraConfig?: Record<string, any>;
}

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: MarketplaceSyncService,
  ) {}

  async createConnection(tenantId: string, dto: CreateConnectionDto) {
    const existing = await this.prisma.marketplaceConnection.findUnique({
      where: {
        tenantId_marketplace_sellerId: {
          tenantId,
          marketplace: dto.marketplace,
          sellerId: dto.sellerId,
        },
      },
    });
    if (existing) throw new ConflictException('Bu pazaryeri bağlantısı zaten mevcut');

    return this.prisma.marketplaceConnection.create({
      data: {
        tenantId,
        marketplace: dto.marketplace,
        sellerId: dto.sellerId,
        apiKeyEncrypted: this.encrypt(dto.apiKey),
        apiSecretEncrypted: dto.apiSecret ? this.encrypt(dto.apiSecret) : null,
        extraConfig: dto.extraConfig,
      },
    });
  }

  async getConnections(tenantId: string) {
    const connections = await this.prisma.marketplaceConnection.findMany({
      where: { tenantId },
    });
    // API keylerini döndürme
    return connections.map(c => ({ ...c, apiKeyEncrypted: '***', apiSecretEncrypted: '***' }));
  }

  async deleteConnection(id: string, tenantId: string) {
    const conn = await this.prisma.marketplaceConnection.findFirst({ where: { id, tenantId } });
    if (!conn) throw new NotFoundException('Bağlantı bulunamadı');
    await this.prisma.marketplaceConnection.delete({ where: { id } });
    return { success: true };
  }

  async getOrders(tenantId: string) {
    return this.prisma.marketplaceOrder.findMany({
      where: { tenantId },
      orderBy: { orderedAt: 'desc' },
    });
  }

  async syncAll(tenantId: string) {
    const connections = await this.prisma.marketplaceConnection.findMany({
      where: { tenantId, isActive: true },
    });
    const results = [];
    for (const conn of connections) {
      await this.syncService.syncConnection(conn);
      results.push({ marketplace: conn.marketplace, synced: true });
    }
    return results;
  }

  async syncOne(connectionId: string, tenantId: string) {
    const conn = await this.prisma.marketplaceConnection.findFirst({
      where: { id: connectionId, tenantId },
    });
    if (!conn) throw new NotFoundException('Bağlantı bulunamadı');
    return this.syncService.syncConnection(conn);
  }

  private encrypt(plaintext: string): string {
    try {
      const encKey = process.env.APP_ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';
      const key = Buffer.from(encKey.padEnd(32).slice(0, 32));
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      const encrypted = cipher.update(plaintext, 'utf-8', 'hex') + cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch {
      return plaintext;
    }
  }
}
