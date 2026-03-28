import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class SqlInjectionGuard implements CanActivate {
    private readonly logger;
    private readonly SQLI_PATTERNS;
    canActivate(context: ExecutionContext): boolean;
}
