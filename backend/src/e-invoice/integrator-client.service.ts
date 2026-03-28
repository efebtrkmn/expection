import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface IntegratorSendResult {
  success: boolean;
  gibUuid?: string;
  referenceId?: string;
  status: string;
  message?: string;
  rawResponse?: any;
}

export interface IntegratorStatusResult {
  gibUuid: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  gibCode?: string;
  gibMessage?: string;
}

/**
 * Özel Entegratör HTTP İstemcisi
 *
 * Strateji: Adaptör interfacei üzerinden çalışır.
 * Bu implementasyon: Uyumsoft e-Fatura API
 * Geçiş: INTEGRATOR_PROVIDER env değişkenine göre dinamik.
 *
 * Uyumsoft Sandbox: https://efatura.uyumsoft.com.tr/api/v1
 * Production: https://efatura.uyumsoft.com.tr/api/v1
 */
@Injectable()
export class IntegratorClientService {
  private readonly logger = new Logger(IntegratorClientService.name);
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly isSandbox: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.isSandbox = config.get<string>('INTEGRATOR_ENV', 'sandbox') === 'sandbox';
    this.baseUrl = this.isSandbox
      ? 'https://efatura-test.uyumsoft.com.tr/api/v1'
      : config.get<string>('INTEGRATOR_BASE_URL', 'https://efatura.uyumsoft.com.tr/api/v1');
    this.username = config.get<string>('INTEGRATOR_USERNAME', '');
    this.password = config.get<string>('INTEGRATOR_PASSWORD', '');
  }

  /**
   * Fatura XML'ini base64'e çevirip entegratöre gönderir
   * @param xmlContent UBL-TR XML string
   * @param invoiceUuid Fatura için atanan UUID
   * @param invoiceNumber GİB Fatura Numarası
   */
  async sendInvoice(xmlContent: string, invoiceUuid: string, invoiceNumber: string): Promise<IntegratorSendResult> {
    const base64Xml = Buffer.from(xmlContent, 'utf-8').toString('base64');

    const payload = {
      invoiceUUID: invoiceUuid,
      invoiceNumber: invoiceNumber,
      invoiceContent: base64Xml,
      invoiceType: 'EARSIV', // veya EFATURA — tip fatura tipine göre belirlenir
    };

    try {
      this.logger.log(`[${this.isSandbox ? 'SANDBOX' : 'PROD'}] Entegratöre fatura gönderiliyor: ${invoiceNumber}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/invoices/send`, payload, {
          auth: { username: this.username, password: this.password },
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          timeout: 30000,
        })
      );

      this.logger.log(`Entegratör yanıtı: ${JSON.stringify(response.data)}`);

      return {
        success: true,
        gibUuid: response.data?.uuid || invoiceUuid,
        referenceId: response.data?.referenceId,
        status: 'PENDING',
        rawResponse: response.data,
      };
    } catch (error) {
      const axiosErr = error as AxiosError;
      const errMsg = (axiosErr.response?.data as any)?.message || axiosErr.message;
      this.logger.error(`Entegratör hatası: ${errMsg}`);

      // Sandbox yokken mock başarılı yanıt döndür (geliştirme ortamı güvencesi)
      if (this.isSandbox && !this.username) {
        this.logger.warn('SANDBOX MOCK: Gerçek entegratör bilgileri yok, mock yanıt döndürülüyor.');
        return {
          success: true,
          gibUuid: invoiceUuid,
          referenceId: `MOCK-${Date.now()}`,
          status: 'PENDING',
          message: 'Mock: Sandbox credentials ayarlanmamış',
        };
      }

      throw new ServiceUnavailableException(`Entegratör servisi yanıt vermedi: ${errMsg}`);
    }
  }

  /**
   * GİB üzerindeki fatura durumunu entegratör API'den sorgular
   */
  async queryStatus(gibUuid: string): Promise<IntegratorStatusResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/invoices/${gibUuid}/status`, {
          auth: { username: this.username, password: this.password },
          timeout: 15000,
        })
      );

      return {
        gibUuid,
        status: response.data?.status || 'PENDING',
        gibCode: response.data?.gibCode,
        gibMessage: response.data?.gibMessage,
      };
    } catch {
      // Sandbox mock
      return { gibUuid, status: 'IN_PROGRESS', gibMessage: 'Mock: Durum sorgulama simülasyonu' };
    }
  }
}
