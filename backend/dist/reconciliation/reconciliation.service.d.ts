import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { SendReconciliationDto, RespondReconciliationDto } from './dto/reconciliation.dto';
export declare class ReconciliationService {
    private readonly prisma;
    private readonly mailService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, mailService: MailService, config: ConfigService);
    sendReconciliation(dto: SendReconciliationDto, tenantId: string, userId: string): Promise<{
        message: string;
        expiresAt: Date;
        periodDays: number;
    }>;
    verifyToken(rawToken: string): Promise<{
        statement: import("@prisma/client/runtime/library").JsonValue;
        customerSupplierId: string;
        expiresAt: Date;
        expiresInHours: number;
    }>;
    respond(rawToken: string, dto: RespondReconciliationDto, ipAddress: string): Promise<{
        message: string;
        status: "REJECTED" | "APPROVED";
        respondedAt: Date;
    }>;
    processTacitApprovals(): Promise<void>;
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
    private findValidRequest;
    private buildStatementSnapshot;
}
