import { Injectable, Logger } from '@nestjs/common';
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

/**
 * SWIFT MT940 Hesap Hareketi Ekstresi Parser
 *
 * MT940 Format Referansı:
 *   :20: Transaction Reference Number
 *   :25: Account Identification (IBAN)
 *   :28C: Statement Number / Sequence Number
 *   :60F: Opening Balance  (C=Credit/D=Debit + Date + Currency + Amount)
 *   :61: Statement Line  (Date + C/D + Amount + Transaction Type)
 *   :86: Information to Account Owner (Açıklama)
 *   :62F: Closing Balance
 */
@Injectable()
export class Mt940ParserService {
  private readonly logger = new Logger(Mt940ParserService.name);

  /**
   * MT940 ham string içeriğini parse ederek yapılandırılmış veriye dönüştürür
   */
  parse(mt940Content: string): Mt940Statement {
    this.logger.log('MT940 parse işlemi başlatılıyor...');

    const lines = mt940Content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');

    const statement: Partial<Mt940Statement> = { transactions: [] };
    let currentTx: Partial<Mt940Transaction> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // :25: IBAN / Hesap No
      if (line.startsWith(':25:')) {
        statement.iban = line.replace(':25:', '').replace(/\s/g, '');
      }

      // :28C: Ekstre Numarası
      else if (line.startsWith(':28C:') || line.startsWith(':28:')) {
        statement.statementNumber = line.replace(/:28C?:/, '').trim();
      }

      // :60F: Açılış Bakiyesi  (Örn: C230328TRY50000,00)
      else if (line.startsWith(':60F:') || line.startsWith(':60M:')) {
        const balanceLine = line.replace(/:60[FM]:/, '');
        const parsed = this.parseBalance(balanceLine);
        statement.openingBalance = parsed.amount;
        statement.currency = parsed.currency;
      }

      // :62F: Kapanış Bakiyesi
      else if (line.startsWith(':62F:') || line.startsWith(':62M:')) {
        const balanceLine = line.replace(/:62[FM]:/, '');
        const parsed = this.parseBalance(balanceLine);
        statement.closingBalance = parsed.amount;
      }

      // :61: İşlem Satırı (Hareket)
      else if (line.startsWith(':61:')) {
        // Önceki işlemi kaydet
        if (currentTx?.amount) {
          statement.transactions!.push(currentTx as Mt940Transaction);
        }
        currentTx = this.parseTransactionLine(line.replace(':61:', ''), statement.currency || 'TRY');
      }

      // :86: Açıklama satırı (önceki :61:' e ait)
      else if (line.startsWith(':86:') && currentTx) {
        currentTx.description = line.replace(':86:', '').trim();
      }
    }

    // Son işlemi kaydet
    if (currentTx?.amount) {
      statement.transactions!.push(currentTx as Mt940Transaction);
    }

    this.logger.log(
      `MT940 parse tamamlandı: IBAN=${statement.iban}, ${statement.transactions?.length} hareket bulundu`
    );

    return statement as Mt940Statement;
  }

  private parseBalance(balanceStr: string): { type: 'CREDIT' | 'DEBIT'; currency: string; date: Date; amount: Decimal } {
    // Format: C230328TRY50000,00
    const typeChar = balanceStr[0]; // C veya D
    const dateStr = balanceStr.substring(1, 7); // YYMMDD
    const currency = balanceStr.substring(7, 10); // TRY
    const amountStr = balanceStr.substring(10).replace(',', '.'); // 50000.00

    return {
      type: typeChar === 'C' ? 'CREDIT' : 'DEBIT',
      currency,
      date: this.parseDate6(dateStr),
      amount: new Decimal(amountStr),
    };
  }

  private parseTransactionLine(line: string, defaultCurrency: string): Partial<Mt940Transaction> {
    // Format: 230328C1180,00NTRFCHQ123456
    // Date(6) + ValueDate(4 opt) + D/C/RD/RC + Amount + Transaction Type + Reference
    try {
      const dateStr = line.substring(0, 6);
      let offset = 6;

      // Opsiyonel Value Date (4 hane MMDD)
      let valueDate: Date | undefined;
      if (/^\d{4}/.test(line.substring(offset, offset + 4))) {
        valueDate = this.parseValueDate(dateStr.substring(0, 2), line.substring(offset, offset + 4));
        offset += 4;
      }

      // Debit/Credit göstergesi
      const dcChar = line[offset];
      const type: 'CREDIT' | 'DEBIT' = (dcChar === 'C' || dcChar === 'R') ? 'CREDIT' : 'DEBIT';
      offset += (line[offset + 1] === 'D' || line[offset + 1] === 'C') ? 2 : 1;

      // Tutar (virgül ondalık ayraç)
      const amountMatch = line.substring(offset).match(/^([\d,]+)/);
      const amountStr = amountMatch ? amountMatch[1].replace(',', '.') : '0';
      offset += amountMatch ? amountMatch[1].length : 0;

      // Referans
      const reference = line.substring(offset).trim();

      return {
        date: this.parseDate6(dateStr),
        valueDate,
        type,
        amount: new Decimal(amountStr),
        currency: defaultCurrency,
        reference: reference.substring(0, 50),
        rawLine: line,
        description: '',
      };
    } catch (err) {
      this.logger.warn(`MT940 satır parse edilemedi: ${line} — ${err}`);
      return { rawLine: line, description: line };
    }
  }

  private parseDate6(dateStr: string): Date {
    const yy = parseInt(dateStr.substring(0, 2));
    const mm = parseInt(dateStr.substring(2, 4)) - 1;
    const dd = parseInt(dateStr.substring(4, 6));
    const year = yy >= 0 && yy <= 30 ? 2000 + yy : 1900 + yy;
    return new Date(year, mm, dd);
  }

  private parseValueDate(yearHint: string, mmdd: string): Date {
    const yy = parseInt(yearHint);
    const year = yy >= 0 && yy <= 30 ? 2000 + yy : 1900 + yy;
    return new Date(year, parseInt(mmdd.substring(0, 2)) - 1, parseInt(mmdd.substring(2, 4)));
  }
}
