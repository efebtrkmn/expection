import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { JournalService } from '../../journal/journal.service';
import { IyzicoSignatureUtil } from './iyzico-signature.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceStatus, PaymentSessionStatus } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { Decimal } from 'decimal.js';

@Injectable()
export class IyzicoCallbackService {
  private readonly logger = new Logger(IyzicoCallbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly journalService: JournalService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Iyzico Callback İşleyicisi
   *
   * Güvenlik: HMAC-SHA256 imza doğrulaması
   * Idempotent: Aynı conversationId ile iki kez gelirse tekrar işlemez
   */
  async handleCallback(payload: Record<string, string>, iyzicoSignature?: string) {
    const token = payload.token;
    const status = payload.status;
    const conversationId = payload.conversationId || payload.conversation_id;

    this.logger.log(`Iyzico Callback alındı: ${conversationId} — ${status}`);

    // 1. HMAC İmza Doğrulama
    if (iyzicoSignature) {
      const session = await this.prisma.paymentSession.findUnique({ where: { conversationId } });
      if (session) {
        const iyzicoSettings = await this.prisma.iyzicoSettings.findUnique({ where: { tenantId: session.tenantId } });
        if (iyzicoSettings) {
          const secretKey = this.decrypt(iyzicoSettings.secretKeyEncrypted);
          const valid = IyzicoSignatureUtil.verifyCallbackSignature(token, secretKey, iyzicoSignature);
          if (!valid) {
            this.logger.error('Iyzico callback imzası geçersiz!');
            throw new UnauthorizedException('Geçersiz Iyzico imzası');
          }
        }
      }
    }

    // 2. Ödeme oturumunu bul
    const session = await this.prisma.paymentSession.findUnique({ where: { conversationId } });
    if (!session) {
      this.logger.warn(`Bilinmeyen conversationId: ${conversationId}`);
      return { received: true };
    }

    // Idempotency: zaten işlenmiş
    if (session.status !== PaymentSessionStatus.PENDING) {
      this.logger.warn(`Zaten işlenmiş callback: ${conversationId}`);
      return { received: true };
    }

    if (status === 'success') {
      await this.handleSuccessfulPayment(session, payload);
    } else {
      await this.handleFailedPayment(session, payload);
    }

    return { received: true };
  }

  private async handleSuccessfulPayment(session: any, payload: any) {
    const { tenantId, invoiceId, customerSupplierId, amount } = session;

    // 1. Oturumu başarılı yap
    await this.prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        status: PaymentSessionStatus.SUCCESS,
        paidAt: new Date(),
        callbackPayload: payload,
      },
    });

    // 1.5 Fatura detaylarını al (transaction işlemi için gerekli)
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customerSupplier: true },
    });
    if (!invoice) throw new Error('Fatura bulunamadı');

    // 2. Faturayi PAID yap, Islemler tablosuna kayit at ve Cari Bakiyeyi guncelle
    const [updatedInvoice, transaction, updatedContact] = await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID },
        include: { customerSupplier: true },
      }),
      this.prisma.transaction.create({
        data: {
          tenantId,
          customerSupplierId,
          invoiceId, // associate with this invoice
          type: 'INCOME',
          amount: Number(amount),
          currency: session.currency || 'TRY',
          description: `Iyzico Kredi Kartı Tahsilatı (Fatura: ${invoice.invoiceNumber})`,
          transactionDate: new Date(),
          paymentMethod: 'CREDIT_CARD',
          createdById: invoice.createdById, // the user who created the invoice
        },
      }),
      this.prisma.customerSupplier.update({
        where: { id: customerSupplierId },
        data: { balance: { decrement: Number(amount) } },
      }),
    ]);

    // 3. Otomatik Tahsilat Yevmiyesi
    //    DR 102 Bankalar (veya 100 Kasa) ← Tahsil edilen net tutar
    //    CR 120 Alıcılar                 ← Alacak kapatma
    await this.createCollectionJournalEntry(tenantId, updatedInvoice, amount);

    // 4. Müşteri'ye ödeme onay e-postası
    const customerEmail = (updatedInvoice.customerSupplier as any)?.email;
    if (customerEmail) {
      await this.mailService.sendPaymentConfirmation(customerEmail, {
        customerName: updatedInvoice.customerSupplier.name,
        invoiceNumber: updatedInvoice.invoiceNumber,
        amount: Number(amount),
        currency: updatedInvoice.currency || 'TRY',
        paidAt: new Date(),
      });
    }

    // 5. Admin'e tahsilat bildirimi
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if ((tenant as any)?.email) {
      await this.mailService.sendAdminPaymentAlert((tenant as any).email, {
        customerName: updatedInvoice.customerSupplier.name,
        invoiceNumber: updatedInvoice.invoiceNumber,
        amount: Number(amount),
      });
    }

    // 6. WebSocket bildirimi (admin dashboard'a)
    this.eventEmitter.emit('payment.success', {
      tenantId,
      invoiceId,
      amount: Number(amount),
      invoiceNumber: updatedInvoice.invoiceNumber,
      customerName: updatedInvoice.customerSupplier.name,
    });

    this.logger.log(`✅ Ödeme başarılı: Fatura ${updatedInvoice.invoiceNumber} → PAID`);
  }

  private async handleFailedPayment(session: any, payload: any) {
    await this.prisma.paymentSession.update({
      where: { id: session.id },
      data: {
        status: PaymentSessionStatus.FAILED,
        callbackPayload: payload,
      },
    });

    this.logger.warn(`❌ Ödeme başarısız: ${session.invoiceId} — ${payload.errorMessage || 'Bilinmeyen hata'}`);
  }

  private async createCollectionJournalEntry(tenantId: string, invoice: any, amount: Decimal | number) {
    try {
      // 102 Bankalar hesabını bul (yoksa 100 Kasa'ya düş)
      const debitAccount = await this.prisma.account.findFirst({
        where: { tenantId, code: { startsWith: '102' }, isActive: true },
      }) || await this.prisma.account.findFirst({
        where: { tenantId, code: { startsWith: '100' }, isActive: true },
      });

      // 120 Alıcılar hesabını bul
      const creditAccount = await this.prisma.account.findFirst({
        where: { tenantId, code: { startsWith: '120' }, isActive: true },
      });

      if (!debitAccount || !creditAccount) {
        this.logger.warn('Tahsilat yevmiyesi: Hesap planı bulunamadı, yevmiye oluşturulamadı');
        return;
      }

      const amountDecimal = new Decimal(amount.toString());

      await this.journalService.postJournalEntry({
        entryNumber: `IYZ-${Date.now()}`,
        entryDate: new Date().toISOString(),
        description: `Iyzico Tahsilat — ${invoice.invoiceNumber}`,
        referenceType: 'PAYMENT' as any,
        referenceId: invoice.id,
        lines: [
          { accountId: debitAccount.id, debit: amountDecimal.toNumber(), credit: 0, description: 'Kredi karti tahsilati' },
          { accountId: creditAccount.id, debit: 0, credit: amountDecimal.toNumber(), description: `Fatura ${invoice.invoiceNumber} tahsilat kapatma` },
        ],
      } as any, tenantId, invoice.createdById);

      this.logger.log(`Tahsilat yevmiyesi oluşturuldu: DR ${debitAccount.code} / CR ${creditAccount.code}`);
    } catch (err) {
      this.logger.error(`Tahsilat yevmiyesi hatası: ${err.message}`);
    }
  }

  private decrypt(encrypted: string): string {
    try {
      const encKey = this.config.get<string>('APP_ENCRYPTION_KEY', 'default-32-char-key-for-dev-only!');
      const key = Buffer.from(encKey.padEnd(32).slice(0, 32));
      const [ivHex, encHex] = encrypted.split(':');
      if (!ivHex || !encHex) return encrypted;
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
      return decipher.update(encHex, 'hex', 'utf-8') + decipher.final('utf-8');
    } catch { return encrypted; }
  }
}
