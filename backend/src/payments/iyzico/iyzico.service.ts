import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IyzicoSignatureUtil } from './iyzico-signature.util';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  /** Tenant için Iyzico ayarlarını DB'den çeker ve API anahtarlarını çözer */
  private async getSettings(tenantId: string) {
    const settings = await this.prisma.iyzicoSettings.findUnique({ where: { tenantId } });
    if (!settings) throw new NotFoundException('Iyzico ayarları yapılandırılmamış. Lütfen ayarlar sayfasından ekleyin.');

    return {
      apiKey: this.decrypt(settings.apiKeyEncrypted),
      secretKey: this.decrypt(settings.secretKeyEncrypted),
      subMerchantKey: settings.subMerchantKey,
      baseUrl: settings.isLive
        ? 'https://api.iyzipay.com'
        : 'https://sandbox-api.iyzipay.com',
    };
  }

  /**
   * Iyzico Sub-Merchant Onboarding (İşletme Kaydı)
   * Admin bir kez çalıştırır — subMerchantKey alınır ve DB'ye kaydedilir
   */
  async onboardSubMerchant(tenantId: string) {
    const settings = await this.getSettings(tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    const body = {
      locale: 'tr',
      conversationId: uuidv4(),
      subMerchantExternalId: tenantId,
      subMerchantType: 'PRIVATE_COMPANY',
      address: tenant?.address || 'Türkiye',
      taxOffice: 'Bağcılar',
      taxNumber: tenant?.taxNumber || '0000000000',
      legalCompanyTitle: tenant?.name,
      name: tenant?.name,
      email: (tenant as any)?.email || 'info@company.com',
      gsm: tenant?.phone || '5000000000',
      currency: 'TRY',
    };

    const bodyStr = JSON.stringify(body);
    const authHeader = IyzicoSignatureUtil.buildAuthorizationHeader(settings.apiKey, settings.secretKey, bodyStr);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${settings.baseUrl}/onboarding/submerchants`, body, {
          headers: {
            Authorization: authHeader,
            'x-iyzi-rnd': Date.now().toString(),
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        })
      );

      const subMerchantKey = response.data?.subMerchantKey;
      if (!subMerchantKey) throw new BadRequestException('SubMerchant key alınamadı: ' + response.data?.errorMessage);

      await this.prisma.iyzicoSettings.update({
        where: { tenantId },
        data: { subMerchantKey, onboardedAt: new Date() },
      });

      this.logger.log(`Iyzico Sub-Merchant onboarding tamamlandı: Tenant ${tenantId}`);
      return { success: true, subMerchantKey };
    } catch (err) {
      this.logger.error(`Iyzico Onboarding hatası: ${err.message}`);
      if (err instanceof BadRequestException) throw err;
      throw new ServiceUnavailableException('Iyzico servisi yanıt vermedi');
    }
  }

  /**
   * Checkout Form Başlatma
   * Müşteri "Kredi Kartı ile Öde" butonuna basınca çağrılır
   * Iyzico token döner → Frontend CheckoutForm'u render eder
   */
  async initializeCheckout(invoiceId: string, tenantId: string, contactId: string) {
    const settings = await this.getSettings(tenantId);

    if (!settings.subMerchantKey) {
      throw new BadRequestException('Sub-merchant kaydı tamamlanmamış. Lütfen onboarding yapın.');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { items: true, customerSupplier: true },
    });

    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    if (invoice.customerSupplierId !== contactId) {
      throw new BadRequestException('Bu faturayı ödeme yetkiniz yok');
    }

    const conversationId = uuidv4();
    const callbackUrl = `${this.config.get('API_BASE_URL', 'http://localhost:3000')}/api/v1/payments/iyzico/callback`;

    const buyer = {
      id: contactId,
      name: invoice.customerSupplier.name.split(' ')[0] || 'Müşteri',
      surname: invoice.customerSupplier.name.split(' ').slice(1).join(' ') || 'Hesabı',
      email: (invoice.customerSupplier as any).email || 'customer@example.com',
      identityNumber: invoice.customerSupplier.taxNumber || '11111111111',
      registrationAddress: invoice.customerSupplier.address || 'Türkiye',
      city: 'İstanbul',
      country: 'Turkey',
      ip: '127.0.0.1', // Gerçek projede req.ip
    };

    const body = {
      locale: 'tr',
      conversationId,
      price: Number(invoice.totalAmount).toFixed(2),
      paidPrice: Number(invoice.totalAmount).toFixed(2),
      currency: invoice.currency || 'TRY',
      basketId: invoice.id,
      paymentGroup: 'PRODUCT',
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      subMerchantKey: settings.subMerchantKey,
      buyer,
      shippingAddress: { contactName: buyer.name + ' ' + buyer.surname, city: 'Istanbul', country: 'Turkey', address: buyer.registrationAddress },
      billingAddress: { contactName: buyer.name + ' ' + buyer.surname, city: 'Istanbul', country: 'Turkey', address: buyer.registrationAddress },
      basketItems: (invoice.items || []).map(item => ({
        id: item.id,
        name: item.description?.substring(0, 255) || 'Ürün',
        category1: 'Fatura',
        itemType: 'VIRTUAL',
        price: Number(item.lineTotal || item.unitPrice).toFixed(2),
        subMerchantKey: settings.subMerchantKey,
        subMerchantPrice: Number(item.lineTotal || item.unitPrice).toFixed(2),
      })),
    };

    const bodyStr = JSON.stringify(body);
    const authHeader = IyzicoSignatureUtil.buildAuthorizationHeader(settings.apiKey, settings.secretKey, bodyStr);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${settings.baseUrl}/payment/iyzipos/checkoutform/initialize/auth/ecommerce`,
          body,
          { headers: { Authorization: authHeader, 'x-iyzi-rnd': Date.now().toString(), 'Content-Type': 'application/json' }, timeout: 15000 }
        )
      );

      if (response.data?.status !== 'success') {
        throw new BadRequestException(`Iyzico: ${response.data?.errorMessage || 'Checkout başlatılamadı'}`);
      }

      // Oturumu kaydet
      await this.prisma.paymentSession.create({
        data: {
          tenantId,
          invoiceId,
          customerSupplierId: contactId,
          iyzicoToken: response.data.token,
          conversationId,
          amount: invoice.totalAmount,
          currency: invoice.currency || 'TRY',
        },
      });

      this.logger.log(`Checkout başlatıldı: Fatura ${invoice.invoiceNumber}, conversationId: ${conversationId}`);

      return {
        token: response.data.token,
        checkoutFormContent: response.data.checkoutFormContent,
        tokenExpireTime: response.data.tokenExpireTime,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      // Sandbox mock
      this.logger.warn('Iyzico MOCK: Checkout form simülasyonu');
      const mockConvId = uuidv4();
      await this.prisma.paymentSession.create({
        data: {
          tenantId, invoiceId, customerSupplierId: contactId,
          iyzicoToken: `MOCK_TOKEN_${Date.now()}`,
          conversationId: mockConvId,
          amount: invoice.totalAmount,
          currency: invoice.currency || 'TRY',
        },
      });
      return {
        token: `MOCK_TOKEN_${Date.now()}`,
        checkoutFormContent: '<div style="padding:20px;text-align:center">🔒 Iyzico Sandbox Simülasyonu — Gerçek Ödeme Formu Burada</div>',
        tokenExpireTime: 1800,
        mock: true,
      };
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
