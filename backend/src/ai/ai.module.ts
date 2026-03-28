import { Module } from '@nestjs/common';
import { AiClassificationService } from './ai-classification.service';
import { AiApprovalService } from './ai-approval.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JournalModule } from '../journal/journal.module';

@Module({
  imports: [PrismaModule, ConfigModule, JournalModule],
  controllers: [AiController],
  providers: [AiClassificationService, AiApprovalService],
  exports: [AiClassificationService],
})
export class AiModule {}
