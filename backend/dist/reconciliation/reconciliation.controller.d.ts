import { Request } from 'express';
import { ReconciliationService } from './reconciliation.service';
import { SendReconciliationDto, RespondReconciliationDto } from './dto/reconciliation.dto';
export declare class ReconciliationController {
    private readonly reconciliationService;
    constructor(reconciliationService: ReconciliationService);
    send(dto: SendReconciliationDto, tenantId: string, userId: string): Promise<{
        message: string;
        expiresAt: Date;
        periodDays: number;
    }>;
    list(tenantId: string): Promise<({
        customerSupplier: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ReconciliationStatus;
        tenantId: string;
        customerSupplierId: string;
        createdById: string;
        tokenHash: string;
        expiresAt: Date;
        sentAt: Date;
        respondedAt: Date | null;
        responseIp: string | null;
        responseNote: string | null;
        statementSnapshot: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    verify(token: string): Promise<{
        statement: import("@prisma/client/runtime/library").JsonValue;
        customerSupplierId: string;
        expiresAt: Date;
        expiresInHours: number;
    }>;
    respond(token: string, dto: RespondReconciliationDto, req: Request): Promise<{
        message: string;
        status: "REJECTED" | "APPROVED";
        respondedAt: Date;
    }>;
}
