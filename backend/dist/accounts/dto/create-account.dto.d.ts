import { AccountType, NormalBalance } from '@prisma/client';
export declare class CreateAccountDto {
    code: string;
    name: string;
    type: AccountType;
    normalBalance: NormalBalance;
    parentCode?: string;
}
export declare class UpdateAccountDto {
    name?: string;
    type?: AccountType;
    normalBalance?: NormalBalance;
    parentCode?: string;
}
