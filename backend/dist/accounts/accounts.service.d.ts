import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
export declare class AccountsService {
    private readonly prisma;
    private readonly auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    findAll(tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        isActive: boolean;
        type: import(".prisma/client").$Enums.AccountType;
        code: string;
        parentCode: string | null;
        normalBalance: import(".prisma/client").$Enums.NormalBalance;
        isSystem: boolean;
    }[]>;
    findOne(id: string, tenantId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        isActive: boolean;
        type: import(".prisma/client").$Enums.AccountType;
        code: string;
        parentCode: string | null;
        normalBalance: import(".prisma/client").$Enums.NormalBalance;
        isSystem: boolean;
    }>;
    create(dto: CreateAccountDto, tenantId: string, userId: string, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        isActive: boolean;
        type: import(".prisma/client").$Enums.AccountType;
        code: string;
        parentCode: string | null;
        normalBalance: import(".prisma/client").$Enums.NormalBalance;
        isSystem: boolean;
    }>;
    update(id: string, dto: UpdateAccountDto, tenantId: string, userId: string, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        isActive: boolean;
        type: import(".prisma/client").$Enums.AccountType;
        code: string;
        parentCode: string | null;
        normalBalance: import(".prisma/client").$Enums.NormalBalance;
        isSystem: boolean;
    }>;
    delete(id: string, tenantId: string, userId: string, ip: string): Promise<void>;
}
