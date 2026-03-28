"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
let MailService = MailService_1 = class MailService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(MailService_1.name);
        this.transporter = nodemailer.createTransport({
            host: config.get('SMTP_HOST', 'smtp.gmail.com'),
            port: config.get('SMTP_PORT', 587),
            secure: config.get('SMTP_SECURE', false),
            auth: {
                user: config.get('SMTP_USER', ''),
                pass: config.get('SMTP_PASS', ''),
            },
        });
    }
    async send(to, subject, template, context) {
        const html = this.renderTemplate(template, context);
        const fromName = this.config.get('MAIL_FROM_NAME', 'Expection SaaS');
        const fromEmail = this.config.get('MAIL_FROM_EMAIL', 'noreply@expection.com');
        try {
            await this.transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject,
                html,
            });
            this.logger.log(`E-posta gönderildi: ${to} — ${subject}`);
        }
        catch (err) {
            this.logger.error(`E-posta gönderilemedi: ${to} — ${err.message}`);
            if (this.config.get('NODE_ENV') === 'production')
                throw err;
        }
    }
    async sendReconciliationLink(to, payload) {
        await this.send(to, `Mutabakat Bildirimi — ${payload.tenantName}`, 'reconciliation-link', payload);
    }
    async sendPaymentConfirmation(to, payload) {
        await this.send(to, `Ödemeniz Alındı: ${payload.invoiceNumber}`, 'payment-confirmation', payload);
    }
    async sendAdminPaymentAlert(to, payload) {
        await this.send(to, `💰 Yeni Tahsilat: ${payload.invoiceNumber}`, 'admin-payment-alert', payload);
    }
    async sendTacitApprovalNotice(to, payload) {
        await this.send(to, 'Mutabakat Zımni Kabul Edildi', 'tacit-approval', payload);
    }
    async sendClientWelcome(to, payload) {
        await this.send(to, `${payload.tenantName} Müşteri Portalına Hoş Geldiniz`, 'client-welcome', payload);
    }
    renderTemplate(templateName, context) {
        const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
        if (!fs.existsSync(templatePath)) {
            return this.buildFallbackHtml(templateName, context);
        }
        const source = fs.readFileSync(templatePath, 'utf-8');
        const compiled = handlebars.compile(source);
        return compiled(context);
    }
    buildFallbackHtml(type, ctx) {
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
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map