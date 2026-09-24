import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviveModule } from '../revive/revive.module';
import { UsersModule } from '../users/users.module';
import { ZoneController } from './zone.controller';
import { ZoneService } from './zone.service';
import { Zone, ZoneSchema } from './schema/zone.schema';
import { Campaign, CampaignSchema } from '../campaigns/schemas/campaign.schema';
import { Creative, CreativeSchema } from '../creative/schema/creative.schema';
import {
  CampaignZoneLink,
  CampaignZoneLinkSchema,
} from '../campaigns/schemas/campaign-zone.link';
import { TargetingService } from '../campaigns/targeting.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Zone.name, schema: ZoneSchema },
      { name: Campaign.name, schema: CampaignSchema },
      { name: Creative.name, schema: CreativeSchema },
      { name: CampaignZoneLink.name, schema: CampaignZoneLinkSchema },
    ]),
    ReviveModule,
    UsersModule,
  ],
  controllers: [ZoneController],
  providers: [ZoneService, TargetingService],
  exports: [ZoneService]
})
export class ZoneModule { }
