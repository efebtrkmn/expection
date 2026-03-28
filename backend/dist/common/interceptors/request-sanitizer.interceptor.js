"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RequestSanitizerInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestSanitizerInterceptor = void 0;
const common_1 = require("@nestjs/common");
const sanitizeHtml = require("sanitize-html");
let RequestSanitizerInterceptor = RequestSanitizerInterceptor_1 = class RequestSanitizerInterceptor {
    constructor() {
        this.logger = new common_1.Logger(RequestSanitizerInterceptor_1.name);
        this.sanitizeOptions = {
            allowedTags: [],
            allowedAttributes: {},
            allowedSchemes: [],
            disallowedTagsMode: 'discard',
        };
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        if (request.body && typeof request.body === 'object') {
            request.body = this.sanitizeDeep(request.body, request.url);
        }
        return next.handle();
    }
    sanitizeDeep(obj, url) {
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
            const sanitized = {};
            for (const key of Object.keys(obj)) {
                sanitized[key] = this.sanitizeDeep(obj[key], url);
            }
            return sanitized;
        }
        return obj;
    }
};
exports.RequestSanitizerInterceptor = RequestSanitizerInterceptor;
exports.RequestSanitizerInterceptor = RequestSanitizerInterceptor = RequestSanitizerInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], RequestSanitizerInterceptor);
//# sourceMappingURL=request-sanitizer.interceptor.js.map