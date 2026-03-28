import { PrismaService } from '../prisma/prisma.service';
import { Marketplace } from '@prisma/client';
import { MarketplaceSyncService } from './marketplace-sync.service';
export declare class CreateConnectionDto {
    marketplace: Marketplace;
    sellerId: string;
    apiKey: string;
    apiSecret?: string;
    extraConfig?: Record<string, any>;
}
export declare class MarketplaceService {
    private readonly prisma;
    private readonly syncService;
    constructor(prisma: PrismaService, syncService: MarketplaceSyncService);
    createConnection(tenantId: string, dto: CreateConnectionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        lastSyncedAt: Date | null;
        marketplace: import(".prisma/client").$Enums.Marketplace;
        sellerId: string;
        apiKeyEncrypted: string;
        apiSecretEncrypted: string | null;
        extraConfig: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getConnections(tenantId: string): Promise<{
        apiKeyEncrypted: string;
        apiSecretEncrypted: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isActive: boolean;
        lastSyncedAt: Date | null;
        marketplace: import(".prisma/client").$Enums.Marketplace;
        sellerId: string;
        extraConfig: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    deleteConnection(id: string, tenantId: string): Promise<{
        success: boolean;
    }>;
    getOrders(tenantId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.MarketplaceOrderStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        invoiceId: string | null;
        marketplace: import(".prisma/client").$Enums.Marketplace;
        connectionId: string;
        orderId: string;
        customerName: string | null;
        customerEmail: string | null;
        rawPayload: import("@prisma/client/runtime/library").JsonValue;
        orderedAt: Date;
    }[]>;
    syncAll(tenantId: string): Promise<any[]>;
    syncOne(connectionId: string, tenantId: string): Promise<void>;
    private encrypt;
}
