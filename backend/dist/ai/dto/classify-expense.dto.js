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
exports.ReviewClassificationDto = exports.ClassifyExpenseDto = exports.AiInputTypeDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var AiInputTypeDto;
(function (AiInputTypeDto) {
    AiInputTypeDto["BANK_TX"] = "BANK_TX";
    AiInputTypeDto["RECEIPT"] = "RECEIPT";
    AiInputTypeDto["MANUAL_ENTRY"] = "MANUAL_ENTRY";
})(AiInputTypeDto || (exports.AiInputTypeDto = AiInputTypeDto = {}));
class ClassifyExpenseDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { inputText: { required: true, type: () => String, maxLength: 2000 }, inputType: { required: false, enum: require("./classify-expense.dto").AiInputTypeDto }, referenceId: { required: false, type: () => String } };
    }
}
exports.ClassifyExpenseDto = ClassifyExpenseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Kırtasiye A.Ş. Ofis Malzemesi Alımı - Kalem, Kağıt, Zımba',
        description: 'Sınıflandırılacak gider metni (OCR çıktısı veya banka açıklaması)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ClassifyExpenseDto.prototype, "inputText", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: AiInputTypeDto, default: AiInputTypeDto.MANUAL_ENTRY }),
    (0, class_validator_1.IsEnum)(AiInputTypeDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ClassifyExpenseDto.prototype, "inputType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Referans kaydı ID (bank_transaction.id vb.)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ClassifyExpenseDto.prototype, "referenceId", void 0);
class ReviewClassificationDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { accountCode: { required: true, type: () => String }, note: { required: false, type: () => String, maxLength: 500 } };
    }
}
exports.ReviewClassificationDto = ReviewClassificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Onaylanan veya düzeltilen hesap kodu', example: '770' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReviewClassificationDto.prototype, "accountCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Gözden geçirme notu', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ReviewClassificationDto.prototype, "note", void 0);
//# sourceMappingURL=classify-expense.dto.js.map