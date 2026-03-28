import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailContext {
  [key: string]: any;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: config.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: config.get<string>('SMTP_USER', ''),
        pass: config.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async send(to: string, subject: string, template: string, context: EmailContext) {
    const html = this.renderTemplate(template, context);

    const fromName = this.config.get<string>('MAIL_FROM_NAME', 'Expection SaaS');
    const fromEmail = this.config.get<string>('MAIL_FROM_EMAIL', 'noreply@expection.com');

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`E-posta gönderildi: ${to} — ${subject}`);
    } catch (err) {
      this.logger.error(`E-posta gönderilemedi: ${to} — ${err.message}`);
      // Production'da throw et, dev'de sadece log
      if (this.config.get('NODE_ENV') === 'production') throw err;
    }
  }

  // ─── Önceden tanımlı şablon metodları ──────────────────────────────────────

  async sendReconciliationLink(to: string, payload: {
    customerName: string;
    tenantName: string;
    link: string;
    expiresAt: Date;
    totalDebt: number;
  }) {
    await this.send(to, `Mutabakat Bildirimi — ${payload.tenantName}`, 'reconciliation-link', payload);
  }

  async sendPaymentConfirmation(to: string, payload: {
    customerName: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    paidAt: Date;
  }) {
    await this.send(to, `Ödemeniz Alındı: ${payload.invoiceNumber}`, 'payment-confirmation', payload);
  }

  async sendAdminPaymentAlert(to: string, payload: {
    customerName: string;
    invoiceNumber: string;
    amount: number;
  }) {
    await this.send(to, `💰 Yeni Tahsilat: ${payload.invoiceNumber}`, 'admin-payment-alert', payload);
  }

  async sendTacitApprovalNotice(to: string, payload: {
    customerName: string;
    tenantName: string;
    period: string;
  }) {
    await this.send(to, 'Mutabakat Zımni Kabul Edildi', 'tacit-approval', payload);
  }

  async sendClientWelcome(to: string, payload: {
    customerName: string;
    tenantName: string;
    portalUrl: string;
  }) {
    await this.send(to, `${payload.tenantName} Müşteri Portalına Hoş Geldiniz`, 'client-welcome', payload);
  }

  private renderTemplate(templateName: string, context: EmailContext): string {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);

    // Şablon dosyası yoksa inline basit HTML döndür (dev ortamı güvencesi)
    if (!fs.existsSync(templatePath)) {
      return this.buildFallbackHtml(templateName, context);
    }

    const source = fs.readFileSync(templatePath, 'utf-8');
    const compiled = handlebars.compile(source);
    return compiled(context);
  }

  private buildFallbackHtml(type: string, ctx: EmailContext): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2 style="color:#6366f1;">Expection</h2>
        <hr>
        <p>${JSON.stringify(ctx, null, 2).replace(/\n/g, '<br>')}</p>
        <hr>
        <small style="color:#999;">Bu e-posta Expection SaaS tarafından gönderilmiştir.</small>
      </div>
    `;
  }
}
