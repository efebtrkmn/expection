import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class RequestSanitizerInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly sanitizeOptions;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private sanitizeDeep;
}
