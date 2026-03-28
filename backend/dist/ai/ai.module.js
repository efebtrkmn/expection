"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const ai_classification_service_1 = require("./ai-classification.service");
const ai_approval_service_1 = require("./ai-approval.service");
const ai_controller_1 = require("./ai.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const config_1 = require("@nestjs/config");
const journal_module_1 = require("../journal/journal.module");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule, journal_module_1.JournalModule],
        controllers: [ai_controller_1.AiController],
        providers: [ai_classification_service_1.AiClassificationService, ai_approval_service_1.AiApprovalService],
        exports: [ai_classification_service_1.AiClassificationService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map