import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Publisher, PublisherDocument } from '../publishers/schemas/publisher.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ReviveService } from '../revive/revive.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { LinkingMode, Zone, ZoneDocument, ZoneStatus } from './schema/zone.schema';
import {
    CampaignZoneLink,
    LinkInitiator,
    LinkStatus,
} from '../campaigns/schemas/campaign-zone.link';
import { PublisherUserDocument } from '../publishers/schemas/publisher.schema';
import { TargetingService } from '../campaigns/targeting.service';
import { CampaignDocument, Campaign } from '../campaigns/schemas/campaign.schema';
import { CreativeDocument, Creative } from '../creative/schema/creative.schema';
import { LinkedBanner, LinkedBannerDocument, LinkedBannerStatus } from '../creative/schema/linked-banner.schema';


@Injectable()
export class ZoneService {
    constructor(
        @InjectModel(Zone.name)
        private readonly zoneModel: Model<ZoneDocument>,
        @InjectModel(Publisher.name)
        private readonly publisherModel: Model<PublisherDocument>,
        @InjectModel(User.name)
        private readonly userModel: Model<UserDocument>,
        @InjectModel(CampaignZoneLink.name)
        private readonly campaignZoneLinkModel: Model<CampaignZoneLink>,
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<CampaignDocument>,
        @InjectModel(Creative.name)
        private readonly creativeModel: Model<CreativeDocument>,
        @InjectModel(CampaignZoneLink.name)
        private readonly linkModel: Model<CampaignZoneLink>,
        @InjectModel(LinkedBanner.name)
        private readonly linkedBannerModel: Model<LinkedBannerDocument>,
        private readonly reviveService: ReviveService,
        private readonly targetingService: TargetingService
    ) { }

    async findByPublisherId(publisherId: string) {
        const publisher = await this.userModel
            .findOne({
                _id: new Types.ObjectId(publisherId),
                accountType: 'Publisher',
            })
            .exec();

        if (!publisher) {
            throw new NotFoundException('Publisher not found');
        }

        const zones = await this.zoneModel
            .find({ publisherId: new Types.ObjectId(publisherId) })
            .lean();

        return Promise.all(zones.map(async (zone) => ({
            id: zone._id.toString(),
            name: zone.name,
            height: zone.height,
            width: zone.width,
            status: zone.status,
            type: zone.type,
            mode: zone.linkingMode,
            campaignsCount: await this.campaignZoneLinkModel.countDocuments({
                zoneId: zone._id,
                status: LinkStatus.ACTIVE,
            }),
        })));
    }

    async create(
        dto: CreateZoneDto,
        publisherId: string,
    ) {
        const publisher = await this.userModel
            .findOne({
                _id: new Types.ObjectId(publisherId),
                accountType: 'Publisher',
            })
            .exec() as unknown as PublisherUserDocument | null;

        if (!publisher) {
            throw new NotFoundException('Publisher not found');
        }

        if (publisher.revivePublisherId == null) {
            throw new BadRequestException('Publisher is not linked to Revive');
        }

        let reviveZoneId: number;
        try {
            reviveZoneId = await this.reviveService.addZone({
                publisherId: publisher.revivePublisherId,
                zoneName: dto.name,
                type: dto.type,
                width: dto.width,
                height: dto.height,
                comments: dto.comments,
            });
        } catch (error) {
            console.log("Revive Error", error)
            throw new BadRequestException(
                'Zone not successfully created in the ad server',
            );
        }

        const publisherZone = await this.zoneModel.create({
            publisherId: new Types.ObjectId(publisherId),
            name: dto.name,
            type: dto.type,
            width: dto.width,
            height: dto.height,
            linkingMode: dto.mode,
            comments: dto.comments,
            reviveZoneId: reviveZoneId,
            status: ZoneStatus.ACTIVE,
        });

        return {
            publisherId: publisherZone._id.toString(),
            name: publisherZone.name,
            type: publisherZone.type,
            width: publisherZone.width,
            height: publisherZone.height,
            comments: publisherZone.comments,
            status: publisherZone.status,
        }
    }


    async generateTag(
        zoneId: string,
        userId: string,
        codeType: string | undefined,
    ) {
        const zone = await this.zoneModel.findById(new Types.ObjectId(zoneId));

        if (!zone) {
            throw new NotFoundException('Zone not found');
        }

        const publisher = await this.publisherModel.findOne({
            _id: userId,
            accountType: "Publisher",
        });

        if (!publisher) {
            throw new NotFoundException('Zone not found');
        }

        if (!zone.reviveZoneId) {
            throw new BadRequestException(
                'Zone has not been provisioned in Revive',
            );
        }

        const tag = await this.reviveService.generateZoneTag(
            zone.reviveZoneId,
            codeType,
            {},
        );

        return {
            tag,
            codeType,
        };
    }

    async getZoneCampaigns(zoneId: string) {
        const zone = await this.zoneModel.findById(new Types.ObjectId(zoneId))

        if (!zone) {
            throw new NotFoundException("Zone not found")
        }

        const [zoneCampaigns, linkedCampaignLinks] = await Promise.all([
            this.targetingService.findEligibleCampaignsForZone(zone, zoneId),
            this.campaignZoneLinkModel
                .find({
                    zoneId: zone._id,
                    status: LinkStatus.ACTIVE,
                })
                .populate({
                    path: 'campaignId',
                    populate: {
                        path: 'advertiser',
                        select: 'advertiserName advertiserEmail',
                    },
                })
                .lean(),
        ]);

        const linkedCampaigns = linkedCampaignLinks
            .map((link) => link.campaignId)
            .filter((campaign) => campaign != null);

        return {
            zone,
            campaigns: zoneCampaigns,
            linkedCampaigns,
        }

    }

    async linkCampaignToZone(zoneId: string, campaignId: string, userId: string) {
        const zone = await this.zoneModel.findById(new Types.ObjectId(zoneId))

        if (!zone) {
            throw new NotFoundException("Zone not found")
        }

        if (zone.publisherId.toString() !== userId) {
            throw new ForbiddenException('You can only link campaigns to your own zones');
        }

        const campaign = await this.campaignModel.findById(new Types.ObjectId(campaignId));

        if (!campaign) {
            throw new NotFoundException("Campaign not found");
        }

        const creatives = await this.creativeModel.findOne({
            campaignId: new Types.ObjectId(campaignId),
            width: zone.width,
            height: zone.height,
        }).lean();

        if (!creatives) {
            throw new BadRequestException(
                'No banners in this campaign match this zone\'s dimensions',
            );
        }

        try {
            await this.reviveService.linkZoneToBanner(zone.reviveZoneId, creatives.reviveBannerId);
        } catch (error) {
            console.log("Revive Error", error)
            throw new BadRequestException(
                'Campaign not successfully linked to Zone in the ad server',
            );
        }

        const campaignObjectId = new Types.ObjectId(campaignId);
        const zoneObjectId = new Types.ObjectId(zoneId);
        const publisherObjectId = new Types.ObjectId(userId);

        const linkedBanner = await this.linkedBannerModel.findOneAndUpdate(
            { campaignId: campaignObjectId, zoneId: zoneObjectId },
            {
                $set: {
                    campaignId: campaignObjectId,
                    creativeId: creatives._id,
                    zoneId: zoneObjectId,
                    publisherId: publisherObjectId,
                    reviveCampaignId: campaign.reviveCampaignId,
                    reviveZoneId: zone.reviveZoneId,
                    reviveBannerId: creatives.reviveBannerId,
                    status: LinkedBannerStatus.ACTIVE,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        await this.linkModel.findOneAndUpdate(
            { campaignId: campaignObjectId, zoneId: zoneObjectId },
            {
                $set: {
                    campaignId: campaignObjectId,
                    zoneId: zoneObjectId,
                    reviveCampaignId: campaign.reviveCampaignId,
                    reviveZoneId: zone.reviveZoneId,
                    status: LinkStatus.ACTIVE,
                    initiatedBy: LinkInitiator.PUBLISHER,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        return linkedBanner;
    }

    async unlinkCampaignFromZone(zoneId: string, campaignId: string, userId: string) {
        const zone = await this.zoneModel.findById(new Types.ObjectId(zoneId));
        if (!zone) {
            throw new NotFoundException("Zone not found");
        }

        if (zone.publisherId.toString() !== userId) {
            throw new ForbiddenException('You can only unlink campaigns from your own zones');
        }

        const campaign = await this.campaignModel.findById(new Types.ObjectId(campaignId));
        if (!campaign) {
            throw new NotFoundException("Campaign not found");
        }

        const banner = await this.linkedBannerModel.findOne({
            campaignId: new Types.ObjectId(campaignId),
            zoneId: new Types.ObjectId(zoneId),
            status: LinkedBannerStatus.ACTIVE,
        });

        if (!banner) {
            throw new BadRequestException(
                'No active link found between this campaign and zone',
            );
        }

        try {
            await this.reviveService.unlinkZoneFromBanner(zone.reviveZoneId, banner.reviveBannerId);
        } catch (error) {
            throw new BadRequestException(
                'Failed to unlink campaign from zone in the ad server',
            );
        }

        const campaignObjectId = new Types.ObjectId(campaignId);
        const zoneObjectId = new Types.ObjectId(zoneId);

        await this.linkModel.findOneAndUpdate(
            { campaignId: campaignObjectId, zoneId: zoneObjectId },
            {
                $set: {
                    status: LinkStatus.UNLINKED,
                },
            },
        );

        await this.linkedBannerModel.findOneAndUpdate(
            { campaignId: campaignObjectId, zoneId: zoneObjectId },
            {
                $set: {
                    status: LinkedBannerStatus.UNLINKED,
                },
            },
        );

        return { message: 'Campaign successfully unlinked from zone' };
    }
}