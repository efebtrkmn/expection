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
exports.ClientLoginDto = exports.ClientRegisterDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ClientRegisterDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { email: { required: true, type: () => String }, password: { required: true, type: () => String, minLength: 8 }, customerSupplierId: { required: true, type: () => String }, tenantId: { required: true, type: () => String } };
    }
}
exports.ClientRegisterDto = ClientRegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'musteri@firma.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ClientRegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'GüçlüŞifre123!', minLength: 8 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], ClientRegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Müşterinin cari kaydı (CustomerSupplier) ID\'si' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ClientRegisterDto.prototype, "customerSupplierId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tenant kimliği (subdomain veya domain üzerinden belirlenir)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ClientRegisterDto.prototype, "tenantId", void 0);
class ClientLoginDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { email: { required: true, type: () => String }, password: { required: true, type: () => String }, tenantId: { required: true, type: () => String } };
    }
}
exports.ClientLoginDto = ClientLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'musteri@firma.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ClientLoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ClientLoginDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tenant kimliği' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ClientLoginDto.prototype, "tenantId", void 0);
//# sourceMappingURL=client-login.dto.js.map