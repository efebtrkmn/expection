import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BankingService } from './banking.service';
import { BankSyncService } from './bank-sync.service';
import { Mt940ParserService } from './mt940-parser.service';
import { ReconciliationService } from './reconciliation.service';
import { BankingController } from './banking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule, HttpModule.register({ timeout: 20000 })],
  controllers: [BankingController],
  providers: [BankingService, BankSyncService, Mt940ParserService, ReconciliationService],
  exports: [BankingService, BankSyncService],
})
export class BankingModule {}
