"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const marketplace_service_1 = require("./marketplace.service");
const marketplace_sync_service_1 = require("./marketplace-sync.service");
const marketplace_controller_1 = require("./marketplace.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const config_1 = require("@nestjs/config");
let MarketplaceModule = class MarketplaceModule {
};
exports.MarketplaceModule = MarketplaceModule;
exports.MarketplaceModule = MarketplaceModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule, axios_1.HttpModule.register({ timeout: 20000 })],
        controllers: [marketplace_controller_1.MarketplaceController],
        providers: [marketplace_service_1.MarketplaceService, marketplace_sync_service_1.MarketplaceSyncService],
        exports: [marketplace_service_1.MarketplaceService, marketplace_sync_service_1.MarketplaceSyncService],
    })
], MarketplaceModule);
//# sourceMappingURL=marketplace.module.js.map