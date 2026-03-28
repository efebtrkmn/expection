import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as sanitizeHtml from 'sanitize-html';

/**
 * Request Sanitizer Interceptor — XSS / HTML Injection Koruması
 *
 * Her gelen request'in JSON body'sindeki string alanlarını
 * sanitize-html ile temizler. Zararlı HTML/script içerikleri kaldırılır.
 *
 * Allowedtags boş bırakılarak HİÇBİR HTML tag'ına izin verilmez.
 * Kısıtlama: GET query params ayrıca ValidationPipe whitelist ile korunur.
 */
@Injectable()
export class RequestSanitizerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestSanitizerInterceptor.name);

  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: [],          // Hiçbir HTML tag'ına izin verilmez
    allowedAttributes: {},    // Hiçbir attribute'a izin verilmez
    allowedSchemes: [],       // javascript:, vbscript: vb. URI scheme'leri engelle
    disallowedTagsMode: 'discard',
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.body && typeof request.body === 'object') {
      request.body = this.sanitizeDeep(request.body, request.url);
    }

    return next.handle();
  }

  private sanitizeDeep(obj: any, url?: string): any {
    if (typeof obj === 'string') {
      const cleaned = sanitizeHtml(obj, this.sanitizeOptions);
      if (cleaned !== obj) {
        this.logger.warn(`XSS girişimi engellendi [${url}]: "${obj.substring(0, 60)}..."`);
      }
      return cleaned;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeDeep(item, url));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key of Object.keys(obj)) {
        sanitized[key] = this.sanitizeDeep(obj[key], url);
      }
      return sanitized;
    }

    return obj; // number, boolean, null — dokunma
  }
}
