import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EInvoiceService } from './e-invoice.service';
import { EInvoiceController } from './e-invoice.controller';
import { UblBuilderService } from './ubl-builder.service';
import { IntegratorClientService } from './integrator-client.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
  ],
  controllers: [EInvoiceController],
  providers: [EInvoiceService, UblBuilderService, IntegratorClientService],
  exports: [EInvoiceService, UblBuilderService],
})
export class EInvoiceModule {}
