"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Mt940ParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mt940ParserService = void 0;
const common_1 = require("@nestjs/common");
const decimal_js_1 = require("decimal.js");
let Mt940ParserService = Mt940ParserService_1 = class Mt940ParserService {
    constructor() {
        this.logger = new common_1.Logger(Mt940ParserService_1.name);
    }
    parse(mt940Content) {
        this.logger.log('MT940 parse işlemi başlatılıyor...');
        const lines = mt940Content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n');
        const statement = { transactions: [] };
        let currentTx = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith(':25:')) {
                statement.iban = line.replace(':25:', '').replace(/\s/g, '');
            }
            else if (line.startsWith(':28C:') || line.startsWith(':28:')) {
                statement.statementNumber = line.replace(/:28C?:/, '').trim();
            }
            else if (line.startsWith(':60F:') || line.startsWith(':60M:')) {
                const balanceLine = line.replace(/:60[FM]:/, '');
                const parsed = this.parseBalance(balanceLine);
                statement.openingBalance = parsed.amount;
                statement.currency = parsed.currency;
            }
            else if (line.startsWith(':62F:') || line.startsWith(':62M:')) {
                const balanceLine = line.replace(/:62[FM]:/, '');
                const parsed = this.parseBalance(balanceLine);
                statement.closingBalance = parsed.amount;
            }
            else if (line.startsWith(':61:')) {
                if (currentTx?.amount) {
                    statement.transactions.push(currentTx);
                }
                currentTx = this.parseTransactionLine(line.replace(':61:', ''), statement.currency || 'TRY');
            }
            else if (line.startsWith(':86:') && currentTx) {
                currentTx.description = line.replace(':86:', '').trim();
            }
        }
        if (currentTx?.amount) {
            statement.transactions.push(currentTx);
        }
        this.logger.log(`MT940 parse tamamlandı: IBAN=${statement.iban}, ${statement.transactions?.length} hareket bulundu`);
        return statement;
    }
    parseBalance(balanceStr) {
        const typeChar = balanceStr[0];
        const dateStr = balanceStr.substring(1, 7);
        const currency = balanceStr.substring(7, 10);
        const amountStr = balanceStr.substring(10).replace(',', '.');
        return {
            type: typeChar === 'C' ? 'CREDIT' : 'DEBIT',
            currency,
            date: this.parseDate6(dateStr),
            amount: new decimal_js_1.Decimal(amountStr),
        };
    }
    parseTransactionLine(line, defaultCurrency) {
        try {
            const dateStr = line.substring(0, 6);
            let offset = 6;
            let valueDate;
            if (/^\d{4}/.test(line.substring(offset, offset + 4))) {
                valueDate = this.parseValueDate(dateStr.substring(0, 2), line.substring(offset, offset + 4));
                offset += 4;
            }
            const dcChar = line[offset];
            const type = (dcChar === 'C' || dcChar === 'R') ? 'CREDIT' : 'DEBIT';
            offset += (line[offset + 1] === 'D' || line[offset + 1] === 'C') ? 2 : 1;
            const amountMatch = line.substring(offset).match(/^([\d,]+)/);
            const amountStr = amountMatch ? amountMatch[1].replace(',', '.') : '0';
            offset += amountMatch ? amountMatch[1].length : 0;
            const reference = line.substring(offset).trim();
            return {
                date: this.parseDate6(dateStr),
                valueDate,
                type,
                amount: new decimal_js_1.Decimal(amountStr),
                currency: defaultCurrency,
                reference: reference.substring(0, 50),
                rawLine: line,
                description: '',
            };
        }
        catch (err) {
            this.logger.warn(`MT940 satır parse edilemedi: ${line} — ${err}`);
            return { rawLine: line, description: line };
        }
    }
    parseDate6(dateStr) {
        const yy = parseInt(dateStr.substring(0, 2));
        const mm = parseInt(dateStr.substring(2, 4)) - 1;
        const dd = parseInt(dateStr.substring(4, 6));
        const year = yy >= 0 && yy <= 30 ? 2000 + yy : 1900 + yy;
        return new Date(year, mm, dd);
    }
    parseValueDate(yearHint, mmdd) {
        const yy = parseInt(yearHint);
        const year = yy >= 0 && yy <= 30 ? 2000 + yy : 1900 + yy;
        return new Date(year, parseInt(mmdd.substring(0, 2)) - 1, parseInt(mmdd.substring(2, 4)));
    }
};
exports.Mt940ParserService = Mt940ParserService;
exports.Mt940ParserService = Mt940ParserService = Mt940ParserService_1 = __decorate([
    (0, common_1.Injectable)()
], Mt940ParserService);
//# sourceMappingURL=mt940-parser.service.js.map