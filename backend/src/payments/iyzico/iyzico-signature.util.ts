import * as crypto from 'crypto';

/**
 * Iyzico API Kimlik Doğrulama Yardımcısı
 *
 * Iyzico, her API isteğinde Authorization header bekler:
 * Authorization: IYZWS {apiKey}:{base64(sha256(apiKey + randomString + secretKey + body))}
 *
 * Referans: https://docs.iyzipay.com/tr/api-entegrasyonu/authorization
 */
export class IyzicoSignatureUtil {
  /**
   * Iyzico Authorization header'ı üretir
   */
  static buildAuthorizationHeader(apiKey: string, secretKey: string, requestBody: string): string {
    const randomString = Math.floor(Math.random() * 1000000).toString();
    const hashStr = apiKey + randomString + secretKey + requestBody;
    const hash = crypto.createHmac('sha256', secretKey).update(hashStr).digest('base64');
    return `IYZWS ${apiKey}:${hash}`;
  }

  /**
   * Iyzico Callback imzasını doğrular
   * Callback payload'undan conversationId + status + paymentId alınır
   * SHA1(secretKey + token) ile iyzicoSignature header karşılaştırılır
   */
  static verifyCallbackSignature(token: string, secretKey: string, expectedSignature: string): boolean {
    if (!secretKey || !expectedSignature) return false;
    const hash = crypto.createHash('sha1').update(`${secretKey}${token}`).digest('hex');
    return hash === expectedSignature;
  }

  /** ISO 8601 timestamp */
  static timestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }
}
