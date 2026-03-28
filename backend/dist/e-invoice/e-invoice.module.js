"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EInvoiceModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const e_invoice_service_1 = require("./e-invoice.service");
const e_invoice_controller_1 = require("./e-invoice.controller");
const ubl_builder_service_1 = require("./ubl-builder.service");
const integrator_client_service_1 = require("./integrator-client.service");
const prisma_module_1 = require("../prisma/prisma.module");
const audit_log_module_1 = require("../audit-log/audit-log.module");
const config_1 = require("@nestjs/config");
let EInvoiceModule = class EInvoiceModule {
};
exports.EInvoiceModule = EInvoiceModule;
exports.EInvoiceModule = EInvoiceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            audit_log_module_1.AuditLogModule,
            config_1.ConfigModule,
            axios_1.HttpModule.register({
                timeout: 30000,
                maxRedirects: 3,
            }),
        ],
        controllers: [e_invoice_controller_1.EInvoiceController],
        providers: [e_invoice_service_1.EInvoiceService, ubl_builder_service_1.UblBuilderService, integrator_client_service_1.IntegratorClientService],
        exports: [e_invoice_service_1.EInvoiceService, ubl_builder_service_1.UblBuilderService],
    })
], EInvoiceModule);
//# sourceMappingURL=e-invoice.module.js.map