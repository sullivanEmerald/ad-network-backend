import { Module } from '@nestjs/common';
import { CreativeService } from './creative.service';
import { CreativeSchema, Creative } from './schema/creative.schema';
import { Campaign, CampaignSchema } from '../campaigns/schemas/campaign.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviveModule } from '../revive/revive.module';
import { CreativeController } from './creative.controller';
import { LinkedBanner, LinkedBannerSchema } from './schema/linked-banner.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Creative.name, schema: CreativeSchema, },
      { name: LinkedBanner.name, schema: LinkedBannerSchema },
      { name: Campaign.name, schema: CampaignSchema, },
    ]),
    ReviveModule,
  ],
  providers: [CreativeService],
  controllers: [CreativeController],
  exports: [CreativeService]
})
export class CreativeModule { }
