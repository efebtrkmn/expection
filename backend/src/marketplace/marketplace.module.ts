import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceSyncService } from './marketplace-sync.service';
import { MarketplaceController } from './marketplace.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule, HttpModule.register({ timeout: 20000 })],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceSyncService],
  exports: [MarketplaceService, MarketplaceSyncService],
})
export class MarketplaceModule {}
