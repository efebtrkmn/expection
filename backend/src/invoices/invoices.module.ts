import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoiceCalculatorService } from './invoice-items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { JournalModule } from '../journal/journal.module';
import { ProductsModule } from '../products/products.module';
import { InvoiceJournalListener } from './listeners/invoice-journal.listener';
import { InvoiceStockListener } from './listeners/invoice-stock.listener';

@Module({
  imports: [PrismaModule, AuditLogModule, JournalModule, ProductsModule],
  controllers: [InvoicesController],
  providers: [
    InvoicesService, 
    InvoiceCalculatorService,
    InvoiceJournalListener, // Event Listener: Otomatik Yevmiye Kaydı
    InvoiceStockListener    // Event Listener: Stok Düşümü ve WebSocket Alarmı
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
