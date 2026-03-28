export declare class IyzicoSignatureUtil {
    static buildAuthorizationHeader(apiKey: string, secretKey: string, requestBody: string): string;
    static verifyCallbackSignature(token: string, secretKey: string, expectedSignature: string): boolean;
    static timestamp(): string;
}
