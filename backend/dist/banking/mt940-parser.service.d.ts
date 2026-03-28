import { Decimal } from 'decimal.js';
export interface Mt940Transaction {
    date: Date;
    valueDate?: Date;
    type: 'CREDIT' | 'DEBIT';
    amount: Decimal;
    currency: string;
    reference: string;
    description: string;
    rawLine: string;
}
export interface Mt940Statement {
    iban: string;
    statementNumber: string;
    openingBalance: Decimal;
    closingBalance: Decimal;
    currency: string;
    transactions: Mt940Transaction[];
}
export declare class Mt940ParserService {
    private readonly logger;
    parse(mt940Content: string): Mt940Statement;
    private parseBalance;
    private parseTransactionLine;
    private parseDate6;
    private parseValueDate;
}
