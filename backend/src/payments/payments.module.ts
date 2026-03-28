import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IyzicoService } from './iyzico/iyzico.service';
import { IyzicoCallbackService } from './iyzico/iyzico-callback.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JournalModule } from '../journal/journal.module';
import { ClientPortalModule } from '../client-portal/client-portal.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JournalModule,
    ClientPortalModule,
    HttpModule.register({ timeout: 20000 }),
  ],
  controllers: [PaymentsController],
  providers: [IyzicoService, IyzicoCallbackService],
  exports: [IyzicoService],
})
export class PaymentsModule {}
