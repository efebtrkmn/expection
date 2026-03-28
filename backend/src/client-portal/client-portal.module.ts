import { Module } from '@nestjs/common';
import { ClientAuthService } from './client-auth/client-auth.service';
import { ClientAuthController } from './client-auth/client-auth.controller';
import { ClientInvoicesService } from './client-invoices/client-invoices.service';
import { ClientInvoicesController } from './client-invoices/client-invoices.controller';
import { ClientStatementService } from './client-statement/client-statement.service';
import { ClientJwtGuard } from './guards/client-jwt.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, ConfigModule, JwtModule.register({})],
  controllers: [ClientAuthController, ClientInvoicesController],
  providers: [ClientAuthService, ClientInvoicesService, ClientStatementService, ClientJwtGuard],
  exports: [ClientAuthService],
})
export class ClientPortalModule {}
