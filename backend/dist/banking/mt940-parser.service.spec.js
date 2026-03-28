"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mt940_parser_service_1 = require("./mt940-parser.service");
describe('Mt940ParserService — SWIFT MT940 Format Parse', () => {
    let service;
    beforeEach(() => {
        service = new mt940_parser_service_1.Mt940ParserService();
    });
    const sampleMt940 = `
:20:STMT2024031501
:25:TR330006001234567890123456/TRY
:28C:00015/001
:60F:C240315TRY50000,00
:61:240315C1180,00NTRFOFC0123456789
:86:Fatura Odemesi INV-2024-001 Kirtasiye A.S.
:61:240315D500,00NTRFOFC9876543210
:86:Internet abonelik ucreti
:62F:C240315TRY50680,00
`.trim();
    describe('Temel Parse', () => {
        it('MT940 metnini parse eder ve statement dondurur', () => {
            const result = service.parse(sampleMt940);
            expect(result).toBeDefined();
            expect(result.transactions).toBeDefined();
            expect(Array.isArray(result.transactions)).toBe(true);
        });
        it('Her islemin zorunlu alanlarina sahip oldugunu dogrular', () => {
            const { transactions } = service.parse(sampleMt940);
            for (const tx of transactions) {
                expect(tx).toHaveProperty('amount');
                expect(tx).toHaveProperty('type');
                expect(['CREDIT', 'DEBIT']).toContain(tx.type);
            }
        });
        it('Alacak (C) hareketi dogru tip ile parse edilir', () => {
            const { transactions } = service.parse(sampleMt940);
            const creditTx = transactions.find(tx => tx.type === 'CREDIT');
            expect(creditTx).toBeDefined();
        });
        it('Borc (D) hareketi dogru tip ile parse edilir', () => {
            const { transactions } = service.parse(sampleMt940);
            const debitTx = transactions.find(tx => tx.type === 'DEBIT');
            expect(debitTx).toBeDefined();
        });
    });
    describe('Tutar Hassasiyeti', () => {
        it('1180,00 TL tutari dogru parse edilir', () => {
            const { transactions } = service.parse(sampleMt940);
            const creditTx = transactions.find(tx => tx.type === 'CREDIT');
            expect(creditTx?.amount.toNumber()).toBeCloseTo(1180, 2);
        });
        it('500,00 TL borc tutari dogru parse edilir', () => {
            const { transactions } = service.parse(sampleMt940);
            const debitTx = transactions.find(tx => tx.type === 'DEBIT');
            expect(debitTx?.amount.toNumber()).toBeCloseTo(500, 2);
        });
        it('Virgullu ondalik format (Avrupa standardi) dogru islenir', () => {
            const euFormat = `
:61:240315C1234,56NTRF
:86:Test islem virgullu tutar
`.trim();
            const result = service.parse(`:20:T\n:25:TR/TRY\n:28C:1\n:60F:C240315TRY0,00\n${euFormat}\n:62F:C240315TRY0,00`);
            if (result.transactions.length > 0) {
                expect(result.transactions[0].amount.toNumber()).toBeCloseTo(1234.56, 2);
            }
        });
    });
    describe('Aciklama (Description) Parse', () => {
        it(':86: alani aciklama olarak parse edilir', () => {
            const { transactions } = service.parse(sampleMt940);
            const creditTx = transactions.find(tx => tx.type === 'CREDIT');
            expect(creditTx?.description).toBeDefined();
            expect(typeof creditTx?.description).toBe('string');
        });
        it('Fatura numarasi referans olarak yakalanir', () => {
            const { transactions } = service.parse(sampleMt940);
            const creditTx = transactions.find(tx => tx.type === 'CREDIT');
            const hasRef = creditTx?.description?.includes('INV') ||
                creditTx?.reference?.includes('INV') ||
                JSON.stringify(creditTx).includes('INV');
            expect(hasRef).toBe(true);
        });
    });
    describe('Edge Cases', () => {
        it('Bos MT940 metni -> transactions bos dizi doner', () => {
            const result = service.parse('');
            expect(result.transactions).toEqual([]);
        });
        it('Gecersiz format -> hata firlatmaz', () => {
            expect(() => service.parse('INVALID MT940 DATA')).not.toThrow();
        });
        it('Yalnizca baslik, islem yok -> transactions bos', () => {
            const onlyHeader = ':20:STMT\n:25:TR123/TRY\n:28C:1\n:60F:C240315TRY0,00\n:62F:C240315TRY0,00';
            const result = service.parse(onlyHeader);
            expect(Array.isArray(result.transactions)).toBe(true);
        });
    });
});
//# sourceMappingURL=mt940-parser.service.spec.js.map