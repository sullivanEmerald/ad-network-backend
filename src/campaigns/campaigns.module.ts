import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { Advertiser, AdvertiserSchema } from '../advertisers/schema/advertiser.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ReviveModule } from '../revive/revive.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Campaign.name, schema: CampaignSchema },
            { name: Advertiser.name, schema: AdvertiserSchema },
            { name: User.name, schema: UserSchema },
        ]),
        ReviveModule,
    ],
    controllers: [CampaignsController],
    providers: [CampaignsService],
})
export class CampaignsModule { }