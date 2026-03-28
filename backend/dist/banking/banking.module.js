"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const banking_service_1 = require("./banking.service");
const bank_sync_service_1 = require("./bank-sync.service");
const mt940_parser_service_1 = require("./mt940-parser.service");
const reconciliation_service_1 = require("./reconciliation.service");
const banking_controller_1 = require("./banking.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const config_1 = require("@nestjs/config");
let BankingModule = class BankingModule {
};
exports.BankingModule = BankingModule;
exports.BankingModule = BankingModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule, axios_1.HttpModule.register({ timeout: 20000 })],
        controllers: [banking_controller_1.BankingController],
        providers: [banking_service_1.BankingService, bank_sync_service_1.BankSyncService, mt940_parser_service_1.Mt940ParserService, reconciliation_service_1.ReconciliationService],
        exports: [banking_service_1.BankingService, bank_sync_service_1.BankSyncService],
    })
], BankingModule);
//# sourceMappingURL=banking.module.js.map