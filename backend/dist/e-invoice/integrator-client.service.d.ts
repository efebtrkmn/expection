import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
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
export declare class IntegratorClientService {
    private readonly httpService;
    private readonly config;
    private readonly logger;
    private readonly baseUrl;
    private readonly username;
    private readonly password;
    private readonly isSandbox;
    constructor(httpService: HttpService, config: ConfigService);
    sendInvoice(xmlContent: string, invoiceUuid: string, invoiceNumber: string): Promise<IntegratorSendResult>;
    queryStatus(gibUuid: string): Promise<IntegratorStatusResult>;
}
