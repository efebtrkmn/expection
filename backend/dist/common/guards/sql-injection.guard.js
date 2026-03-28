"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SqlInjectionGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlInjectionGuard = void 0;
const common_1 = require("@nestjs/common");
let SqlInjectionGuard = SqlInjectionGuard_1 = class SqlInjectionGuard {
    constructor() {
        this.logger = new common_1.Logger(SqlInjectionGuard_1.name);
        this.SQLI_PATTERNS = [
            /(\bUNION\b\s+\bSELECT\b)/i,
            /(\bDROP\b\s+\bTABLE\b)/i,
            /(\bINSERT\b\s+\bINTO\b)/i,
            /(\bDELETE\b\s+\bFROM\b)/i,
            /(\bUPDATE\b\s+\w+\s+\bSET\b)/i,
            /(\bEXEC\b\s*\()/i,
            /(\bEXECUTE\b\s*\()/i,
            /(';\s*--)/,
            /(1\s*=\s*1)/,
            /(\bOR\b\s*'?\d+'?\s*=\s*'?\d+'?)/i,
            /(xp_cmdshell)/i,
            /(SLEEP\s*\(\d+\))/i,
            /(BENCHMARK\s*\()/i,
        ];
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const checkTargets = [
            JSON.stringify(request.body || {}),
            JSON.stringify(request.query || {}),
            JSON.stringify(request.params || {}),
        ].join(' ');
        for (const pattern of this.SQLI_PATTERNS) {
            if (pattern.test(checkTargets)) {
                this.logger.error(`SQL Injection girişimi: ${request.method} ${request.url} — IP: ${request.ip}`);
                throw new common_1.BadRequestException('Geçersiz istek içeriği tespit edildi');
            }
        }
        return true;
    }
};
exports.SqlInjectionGuard = SqlInjectionGuard;
exports.SqlInjectionGuard = SqlInjectionGuard = SqlInjectionGuard_1 = __decorate([
    (0, common_1.Injectable)()
], SqlInjectionGuard);
//# sourceMappingURL=sql-injection.guard.js.map