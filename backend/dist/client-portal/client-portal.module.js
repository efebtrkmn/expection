"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientPortalModule = void 0;
const common_1 = require("@nestjs/common");
const client_auth_service_1 = require("./client-auth/client-auth.service");
const client_auth_controller_1 = require("./client-auth/client-auth.controller");
const client_invoices_service_1 = require("./client-invoices/client-invoices.service");
const client_invoices_controller_1 = require("./client-invoices/client-invoices.controller");
const client_statement_service_1 = require("./client-statement/client-statement.service");
const client_jwt_guard_1 = require("./guards/client-jwt.guard");
const prisma_module_1 = require("../prisma/prisma.module");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let ClientPortalModule = class ClientPortalModule {
};
exports.ClientPortalModule = ClientPortalModule;
exports.ClientPortalModule = ClientPortalModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule, jwt_1.JwtModule.register({})],
        controllers: [client_auth_controller_1.ClientAuthController, client_invoices_controller_1.ClientInvoicesController],
        providers: [client_auth_service_1.ClientAuthService, client_invoices_service_1.ClientInvoicesService, client_statement_service_1.ClientStatementService, client_jwt_guard_1.ClientJwtGuard],
        exports: [client_auth_service_1.ClientAuthService],
    })
], ClientPortalModule);
//# sourceMappingURL=client-portal.module.js.map