import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
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
