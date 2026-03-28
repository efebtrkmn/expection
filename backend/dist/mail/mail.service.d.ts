import { ConfigService } from '@nestjs/config';
export interface EmailContext {
    [key: string]: any;
}
export declare class MailService {
    private readonly config;
    private readonly logger;
    private transporter;
    constructor(config: ConfigService);
    send(to: string, subject: string, template: string, context: EmailContext): Promise<void>;
    sendReconciliationLink(to: string, payload: {
        customerName: string;
        tenantName: string;
        link: string;
        expiresAt: Date;
        totalDebt: number;
    }): Promise<void>;
    sendPaymentConfirmation(to: string, payload: {
        customerName: string;
        invoiceNumber: string;
        amount: number;
        currency: string;
        paidAt: Date;
    }): Promise<void>;
    sendAdminPaymentAlert(to: string, payload: {
        customerName: string;
        invoiceNumber: string;
        amount: number;
    }): Promise<void>;
    sendTacitApprovalNotice(to: string, payload: {
        customerName: string;
        tenantName: string;
        period: string;
    }): Promise<void>;
    sendClientWelcome(to: string, payload: {
        customerName: string;
        tenantName: string;
        portalUrl: string;
    }): Promise<void>;
    private renderTemplate;
    private buildFallbackHtml;
}
