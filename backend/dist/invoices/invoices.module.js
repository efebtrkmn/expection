"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesModule = void 0;
const common_1 = require("@nestjs/common");
const invoices_service_1 = require("./invoices.service");
const invoices_controller_1 = require("./invoices.controller");
const invoice_items_service_1 = require("./invoice-items.service");
const prisma_module_1 = require("../prisma/prisma.module");
const audit_log_module_1 = require("../audit-log/audit-log.module");
const journal_module_1 = require("../journal/journal.module");
const products_module_1 = require("../products/products.module");
const invoice_journal_listener_1 = require("./listeners/invoice-journal.listener");
const invoice_stock_listener_1 = require("./listeners/invoice-stock.listener");
let InvoicesModule = class InvoicesModule {
};
exports.InvoicesModule = InvoicesModule;
exports.InvoicesModule = InvoicesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, audit_log_module_1.AuditLogModule, journal_module_1.JournalModule, products_module_1.ProductsModule],
        controllers: [invoices_controller_1.InvoicesController],
        providers: [
            invoices_service_1.InvoicesService,
            invoice_items_service_1.InvoiceCalculatorService,
            invoice_journal_listener_1.InvoiceJournalListener,
            invoice_stock_listener_1.InvoiceStockListener
        ],
        exports: [invoices_service_1.InvoicesService],
    })
], InvoicesModule);
//# sourceMappingURL=invoices.module.js.map