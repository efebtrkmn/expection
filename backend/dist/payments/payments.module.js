"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const iyzico_service_1 = require("./iyzico/iyzico.service");
const iyzico_callback_service_1 = require("./iyzico/iyzico-callback.service");
const payments_controller_1 = require("./payments.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const config_1 = require("@nestjs/config");
const journal_module_1 = require("../journal/journal.module");
const client_portal_module_1 = require("../client-portal/client-portal.module");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            config_1.ConfigModule,
            journal_module_1.JournalModule,
            client_portal_module_1.ClientPortalModule,
            axios_1.HttpModule.register({ timeout: 20000 }),
        ],
        controllers: [payments_controller_1.PaymentsController],
        providers: [iyzico_service_1.IyzicoService, iyzico_callback_service_1.IyzicoCallbackService],
        exports: [iyzico_service_1.IyzicoService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map