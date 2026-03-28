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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EInvoiceWebhookDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class EInvoiceWebhookDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { invoiceUUID: { required: true, type: () => String }, status: { required: true, type: () => String }, gibCode: { required: false, type: () => String }, gibMessage: { required: false, type: () => String }, referenceId: { required: false, type: () => String } };
    }
}
exports.EInvoiceWebhookDto = EInvoiceWebhookDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fatura UUID (GİB tarafından atanan)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EInvoiceWebhookDto.prototype, "invoiceUUID", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'GİB durum kodu', enum: ['PENDING', 'IN_PROGRESS', 'ACCEPTED', 'REJECTED', 'CANCELLED'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EInvoiceWebhookDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'GİB sonuç kodu (örn: 1300, 1220)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EInvoiceWebhookDto.prototype, "gibCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'GİB açıklama mesajı', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EInvoiceWebhookDto.prototype, "gibMessage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Entegratör referans numarası', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EInvoiceWebhookDto.prototype, "referenceId", void 0);
//# sourceMappingURL=webhook-payload.dto.js.map