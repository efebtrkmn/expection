"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BabsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BabsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BabsService = BabsService_1 = class BabsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(BabsService_1.name);
    }
    async getBaList(tenantId, period) {
        this.logger.log(`[Ba Engine] Running Form Ba limits query for Period: ${period}`);
        return this.prisma.$queryRaw `
      SELECT
        tax_number as "taxNumber",
        party_name as "partyName",
        document_count::integer as "documentCount",
        total_excl_vat as "totalExclVatAmount"
      FROM babs_purchase_summary
      WHERE tenant_id = ${tenantId}::uuid 
        AND period = ${period}
      ORDER BY total_excl_vat DESC;
    `;
    }
    async getBsList(tenantId, period) {
        this.logger.log(`[Bs Engine] Running Form Bs limits query for Period: ${period}`);
        return this.prisma.$queryRaw `
      SELECT
        tax_number as "taxNumber",
        party_name as "partyName",
        document_count::integer as "documentCount",
        total_excl_vat as "totalExclVatAmount"
      FROM babs_sales_summary
      WHERE tenant_id = ${tenantId}::uuid 
        AND period = ${period}
      ORDER BY total_excl_vat DESC;
    `;
    }
};
exports.BabsService = BabsService;
exports.BabsService = BabsService = BabsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BabsService);
//# sourceMappingURL=babs.service.js.map