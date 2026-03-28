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
exports.RespondReconciliationDto = exports.SendReconciliationDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class SendReconciliationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { customerSupplierId: { required: true, type: () => String } };
    }
}
exports.SendReconciliationDto = SendReconciliationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Mutabakat gonderilecek cari hesap IDsi' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendReconciliationDto.prototype, "customerSupplierId", void 0);
class RespondReconciliationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { decision: { required: true, type: () => Object }, note: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.RespondReconciliationDto = RespondReconciliationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['APPROVED', 'REJECTED'] }),
    (0, class_validator_1.IsEnum)(['APPROVED', 'REJECTED']),
    __metadata("design:type", String)
], RespondReconciliationDto.prototype, "decision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Musteri notu (istege bagli)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], RespondReconciliationDto.prototype, "note", void 0);
//# sourceMappingURL=reconciliation.dto.js.map