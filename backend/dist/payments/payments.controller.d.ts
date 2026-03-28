import { IyzicoService } from './iyzico/iyzico.service';
import { IyzicoCallbackService } from './iyzico/iyzico-callback.service';
declare class SaveIyzicoSettingsDto {
    apiKey: string;
    secretKey: string;
    subMerchantType?: string;
}
export declare class PaymentsController {
    private readonly iyzicoService;
    private readonly callbackService;
    constructor(iyzicoService: IyzicoService, callbackService: IyzicoCallbackService);
    saveSettings(dto: SaveIyzicoSettingsDto, tenantId: string): Promise<{
        message: string;
        tenantId: string;
    }>;
    onboard(tenantId: string): Promise<{
        success: boolean;
        subMerchantKey: any;
    }>;
    initCheckout(invoiceId: string, req: any): Promise<{
        token: any;
        checkoutFormContent: any;
        tokenExpireTime: any;
        mock?: undefined;
    } | {
        token: string;
        checkoutFormContent: string;
        tokenExpireTime: number;
        mock: boolean;
    }>;
    handleCallback(payload: Record<string, string>, signature: string): Promise<{
        received: boolean;
    }>;
}
export {};
