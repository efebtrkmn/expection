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
exports.CreateInvoiceDto = exports.InvoiceItemDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
const swagger_1 = require("@nestjs/swagger");
class InvoiceItemDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { productId: { required: false, type: () => String }, description: { required: true, type: () => String }, quantity: { required: true, type: () => Number, minimum: 0 }, unit: { required: true, type: () => Object }, unitPrice: { required: true, type: () => Number, minimum: 0 }, discountRate: { required: false, type: () => Number, minimum: 0, maximum: 100 }, taxRate: { required: false, type: () => Number, minimum: 0, maximum: 100 }, withholdingRate: { required: false, type: () => Number, minimum: 0, maximum: 100 } };
    }
}
exports.InvoiceItemDto = InvoiceItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Kayıtlı ürün ise IDsi (Yoksa serbest metin satırıdır)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hizmet veya Ürün Açıklaması' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Miktar', example: 1 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ProductUnit, default: client_1.ProductUnit.ADET }),
    (0, class_validator_1.IsEnum)(client_1.ProductUnit),
    __metadata("design:type", String)
], InvoiceItemDto.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Birim Fiyat' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'İskonto Oranı (%)', default: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "discountRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'KDV Oranı (%)', default: 20, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "taxRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'KDV Tevkifatı Oranı (Örn: 9/10 için 90, 5/10 için 50)', default: 0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], InvoiceItemDto.prototype, "withholdingRate", void 0);
class CreateInvoiceDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { customerSupplierId: { required: true, type: () => String }, invoiceNumber: { required: true, type: () => String }, type: { required: true, type: () => Object }, issueDate: { required: true, type: () => String }, dueDate: { required: false, type: () => String }, currency: { required: false, type: () => String }, exchangeRate: { required: false, type: () => Number, minimum: 0.0001 }, notes: { required: false, type: () => String }, items: { required: true, type: () => [require("./create-invoice.dto").InvoiceItemDto] } };
    }
}
exports.CreateInvoiceDto = CreateInvoiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Müşteri / Tedarikçi (Cari) ID' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "customerSupplierId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fatura Numarası (Örn: GIB2024000000001)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.InvoiceType, example: client_1.InvoiceType.SALES }),
    (0, class_validator_1.IsEnum)(client_1.InvoiceType),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fatura Düzenleme Tarihi', example: '2024-03-28' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "issueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Vade Tarihi', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Para Birimi', default: 'TRY', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Döviz Kuru (TRY için 1.00)', default: 1.0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.0001),
    __metadata("design:type", Number)
], CreateInvoiceDto.prototype, "exchangeRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fatura Notları', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInvoiceDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Fatura Kalemleri', type: [InvoiceItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Fatura en az 1 kalem içermelidir' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => InvoiceItemDto),
    __metadata("design:type", Array)
], CreateInvoiceDto.prototype, "items", void 0);
//# sourceMappingURL=create-invoice.dto.js.map