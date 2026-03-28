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
exports.CreateJournalDto = exports.CreateLedgerLineDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
class CreateLedgerLineDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { accountId: { required: true, type: () => String }, description: { required: false, type: () => String }, debit: { required: true, type: () => Number, minimum: 0 }, credit: { required: true, type: () => Number, minimum: 0 }, currency: { required: false, type: () => String }, exchangeRate: { required: false, type: () => Number } };
    }
}
exports.CreateLedgerLineDto = CreateLedgerLineDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hesap ID (Account UUID)' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLedgerLineDto.prototype, "accountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, description: 'Satır açıklaması' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLedgerLineDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Borç Tutarı', minimum: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLedgerLineDto.prototype, "debit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Alacak Tutarı', minimum: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLedgerLineDto.prototype, "credit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: 'TRY' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLedgerLineDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: 1.0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateLedgerLineDto.prototype, "exchangeRate", void 0);
class CreateJournalDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { entryNumber: { required: true, type: () => String }, entryDate: { required: true, type: () => Object }, description: { required: false, type: () => String }, referenceType: { required: true, type: () => Object }, referenceId: { required: false, type: () => String }, status: { required: false, type: () => Object }, lines: { required: true, type: () => [require("./create-journal.dto").CreateLedgerLineDto] } };
    }
}
exports.CreateJournalDto = CreateJournalDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fiş Numarası' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateJournalDto.prototype, "entryNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fiş Tarihi' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], CreateJournalDto.prototype, "entryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.JournalReferenceType, example: client_1.JournalReferenceType.MANUAL }),
    (0, class_validator_1.IsEnum)(client_1.JournalReferenceType),
    __metadata("design:type", String)
], CreateJournalDto.prototype, "referenceType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalDto.prototype, "referenceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.JournalStatus, required: false, default: client_1.JournalStatus.DRAFT }),
    (0, class_validator_1.IsEnum)(client_1.JournalStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateJournalDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateLedgerLineDto], description: 'Muavin Satırları (Borç ve Alacak dengeli olmalı)' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateLedgerLineDto),
    (0, class_validator_1.ArrayMinSize)(2, { message: 'Çift taraflı kayıt için en az 2 satır gereklidir' }),
    __metadata("design:type", Array)
], CreateJournalDto.prototype, "lines", void 0);
//# sourceMappingURL=create-journal.dto.js.map