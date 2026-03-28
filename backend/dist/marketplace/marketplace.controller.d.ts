import { MarketplaceService, CreateConnectionDto } from './marketplace.service';
export declare class MarketplaceController {
    private readonly marketplaceService;
    constructor(marketplaceService: MarketplaceService);
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
    syncOne(id: string, tenantId: string): Promise<void>;
}
