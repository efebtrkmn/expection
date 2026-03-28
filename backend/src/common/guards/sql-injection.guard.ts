import {
  Injectable, CanActivate, ExecutionContext, BadRequestException, Logger,
} from '@nestjs/common';

/**
 * SQL Injection Detection Guard
 *
 * Not: Prisma ORM zaten parameterized queries kullandığı için SQL injection
 * doğrudan DB'ye ulaşamaz. Bu guard, client'a güvenli hata mesajı vermek ve
 * saldırı girişimlerini loglamak amacıyla ek savunma katmanı sağlar.
 * (Defense in Depth ilkesi)
 */
@Injectable()
export class SqlInjectionGuard implements CanActivate {
  private readonly logger = new Logger(SqlInjectionGuard.name);

  /**
   * Tehlikeli SQL pattern'ları (case-insensitive, word-boundary aware)
   * Yanlış pozitif riskini azaltmak için agresif pattern'lardan kaçınıldı
   */
  private readonly SQLI_PATTERNS: RegExp[] = [
    /(\bUNION\b\s+\bSELECT\b)/i,
    /(\bDROP\b\s+\bTABLE\b)/i,
    /(\bINSERT\b\s+\bINTO\b)/i,
    /(\bDELETE\b\s+\bFROM\b)/i,
    /(\bUPDATE\b\s+\w+\s+\bSET\b)/i,
    /(\bEXEC\b\s*\()/i,
    /(\bEXECUTE\b\s*\()/i,
    /(';\s*--)/,            // '; -- Classic SQLi termination
    /(1\s*=\s*1)/,          // 1=1 tautology
    /(\bOR\b\s*'?\d+'?\s*=\s*'?\d+'?)/i, // OR 1='1'
    /(xp_cmdshell)/i,       // MSSQL shell injection
    /(SLEEP\s*\(\d+\))/i,  // Blind SQLi time delay
    /(BENCHMARK\s*\()/i,   // MySQL timing attack
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const checkTargets = [
      JSON.stringify(request.body || {}),
      JSON.stringify(request.query || {}),
      JSON.stringify(request.params || {}),
    ].join(' ');

    for (const pattern of this.SQLI_PATTERNS) {
      if (pattern.test(checkTargets)) {
        this.logger.error(
          `SQL Injection girişimi: ${request.method} ${request.url} — IP: ${request.ip}`
        );
        throw new BadRequestException('Geçersiz istek içeriği tespit edildi');
      }
    }

    return true;
  }
}
