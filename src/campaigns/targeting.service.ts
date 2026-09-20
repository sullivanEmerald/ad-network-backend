import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviveService } from '../revive/revive.service';
import { Creative, CreativeDocument } from '../creative/schema/creative.schema';
import { Zone, ZoneDocument, LinkingMode } from '../zone/schema/zone.schema';
import {
    CampaignZoneLink,
    LinkInitiator,
    LinkStatus,
} from './schemas/campaign-zone.link';


@Injectable()
export class TargetingService {
    private readonly logger = new Logger(TargetingService.name);

    constructor(
        @InjectModel(Zone.name)
        private readonly zoneModel: Model<ZoneDocument>,
        @InjectModel(CampaignZoneLink.name)
        private readonly linkModel: Model<CampaignZoneLink>,
        @InjectModel(Creative.name)
        private readonly creativeModel: Model<CreativeDocument>,
        private readonly reviveService: ReviveService,
    ) { }

    async applyAutomaticLinking(
        campaignMongoId: Types.ObjectId,
        reviveCampaignId: number,
    ): Promise<{ linked: number; failed: number }> {
        const creatives = await this.creativeModel
            .find({ campaignId: campaignMongoId })
            .lean();

        if (creatives.length === 0) {
            this.logger.warn(`No creatives found for campaign ${campaignMongoId}`);
            return { linked: 0, failed: 0 };
        }

        const sizePairs = [
            ...new Map(
                creatives.map((creative) => [
                    `${creative.width}x${creative.height}`,
                    { width: creative.width, height: creative.height },
                ]),
            ).values(),
        ];

        const matchingZones = await this.zoneModel.find({
            linkingMode: LinkingMode.automatic,
            $or: sizePairs.map(({ width, height }) => ({ width, height })),
        }).lean();

        if (matchingZones.length === 0) {
            this.logger.warn(`No matching zones found for campaign ${campaignMongoId}`);
            return { linked: 0, failed: 0 };
        }

        let linked = 0;
        let failed = 0;

        for (const zone of matchingZones) {
            try {
                await this.linkOne(
                    campaignMongoId,
                    zone._id as Types.ObjectId,
                    reviveCampaignId,
                    zone.reviveZoneId,
                    LinkInitiator.SYSTEM,
                );
                linked++;
            } catch (error) {
                failed++;
                this.logger.error(
                    `Failed to link campaign ${campaignMongoId} to zone ${zone._id}`,
                    error,
                );
            }
        }

        return { linked, failed };
    }

    async linkOne(
        campaignMongoId: Types.ObjectId,
        zoneMongoId: Types.ObjectId,
        reviveCampaignId: number,
        reviveZoneId: number,
        initiatedBy: LinkInitiator,
    ): Promise<void> {
        await this.reviveService.linkCampaignToZone(reviveZoneId, reviveCampaignId);

        await this.linkModel.findOneAndUpdate(
            { campaignId: campaignMongoId, zoneId: zoneMongoId },
            {
                campaignId: campaignMongoId,
                zoneId: zoneMongoId,
                reviveCampaignId,
                reviveZoneId,
                status: LinkStatus.ACTIVE,
                initiatedBy,
            },
            { upsert: true, new: true },
        );
    }

    async unlinkAll(campaignMongoId: Types.ObjectId): Promise<void> {
        const links = await this.linkModel.find({
            campaignId: campaignMongoId,
            status: LinkStatus.ACTIVE,
        });

        for (const link of links) {
            try {
                await this.reviveService.unlinkCampaignFromZone(
                    link.reviveZoneId,
                    link.reviveCampaignId,
                );
                link.status = LinkStatus.UNLINKED;
                await link.save();
            } catch (error) {
                this.logger.error(
                    `Failed to unlink campaign ${campaignMongoId} from zone ${link.zoneId}`,
                    error,
                );
            }
        }
    }

    async getLinkedZoneCount(campaignMongoId: Types.ObjectId): Promise<number> {
        return this.linkModel.countDocuments({
            campaignId: campaignMongoId,
            status: LinkStatus.ACTIVE,
        });
    }
}