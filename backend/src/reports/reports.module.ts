import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { BabsService } from './babs.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ReportsController],
  providers: [ReportsService, BabsService],
  exports: [ReportsService, BabsService]
})
export class ReportsModule {}
