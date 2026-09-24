import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { UsersModule } from '../users/users.module';
import { ReviveModule } from '../revive/revive.module';
import { Creative, CreativeSchema } from '../creative/schema/creative.schema';
import { Zone, ZoneSchema } from '../zone/schema/zone.schema';
import {
    CampaignZoneLink,
    CampaignZoneLinkSchema,
} from './schemas/campaign-zone.link';
import { TargetingService } from './targeting.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Campaign.name, schema: CampaignSchema },
            { name: Creative.name, schema: CreativeSchema },
            { name: Zone.name, schema: ZoneSchema },
            { name: CampaignZoneLink.name, schema: CampaignZoneLinkSchema },
        ]),
        ReviveModule,
        UsersModule,
    ],
    controllers: [CampaignsController],
    providers: [CampaignsService, TargetingService],
    exports: [TargetingService],
})
export class CampaignsModule { }