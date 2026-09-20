import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { Advertiser, AdvertiserDocument } from '../advertisers/schema/advertiser.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LaunchCampaignDto } from './dto/campaign.dto';
import { ReviveService } from '../revive/revive.service';
import { CampaignStatus } from './schemas/campaign.schema';
import { Creative, CreativeDocument } from '../creative/schema/creative.schema';
import { TargetingService } from './targeting.service';

@Injectable()
export class CampaignsService {
    constructor(
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<CampaignDocument>,
        @InjectModel(Advertiser.name)
        private readonly advertiserModel: Model<AdvertiserDocument>,
        @InjectModel(User.name)
        private readonly organizationModel: Model<UserDocument>,
        @InjectModel(Creative.name)
        private readonly creativeModel: Model<CreativeDocument>,
        private readonly reviveService: ReviveService,
        private readonly targetingService: TargetingService
    ) { }

    async lanuchCampaign(dto: LaunchCampaignDto, userId: string) {
        const organisationalId = new Types.ObjectId(userId)
        const advertiser = await this.advertiserModel
            .findOne({ organizationId: organisationalId })
            .exec();
        if (!advertiser) {
            throw new NotFoundException('Advertiser not found for this organization');
        }
        if (advertiser.reviveAdvertiserId == null) {
            throw new NotFoundException('Advertiser is not linked to Revive');
        }

        const startDate = new Date(dto.startDate);
        const endDate = dto.endDate
            ? new Date(dto.endDate)
            : undefined;

        if (
            endDate &&
            endDate.getTime() <= startDate.getTime()
        ) {
            throw new BadRequestException(
                'End date must be after start date.',
            );
        }
        let reviveCampaignId: number;
        try {
            reviveCampaignId = await this.reviveService.addCampaign({
                advertiserId: advertiser.reviveAdvertiserId,
                campaignName: dto.campaignName,
                startDate: startDate,
                endDate: endDate
            });
        } catch (error) {
            console.log(error)
            throw new BadRequestException('Failed to create campaign')
        }

        const campaign = await this.campaignModel.create({
            organizationId: new Types.ObjectId(organisationalId),
            advertiserId: advertiser.reviveAdvertiserId,
            campaignName: dto.campaignName,
            reviveCampaignId: reviveCampaignId,
            startDate,
            endDate,
        });

        return {
            message: "Campaign Created Successfully",
            campaignId: campaign._id
        };

    }

    async getCampaigns(userId: string) {
        const organizationId = this.toObjectId(userId);

        const campaigns = await this.campaignModel
            .find({ organizationId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return campaigns.map((campaign) => this.transformCampaign(campaign));
    }

    async getCampaignById(id: string, userId: string) {
        const organizationId = this.toObjectId(userId);
        const campaign = await this.campaignModel
            .findOne({ _id: this.toObjectId(id), organizationId })
            .lean()
            .exec();

        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }

        return this.transformCampaign(campaign);
    }

    async getCampaignSummary(campaignId: string, userId: string): Promise<unknown> {
        const organizationId = this.toObjectId(userId);
        const campaign = await this.campaignModel
            .findOne({ _id: this.toObjectId(campaignId), organizationId })
            .lean()
            .exec();

        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }

        const banners = await this.creativeModel
            .findOne({ campaignId: campaign._id })
            .lean()
            .exec();

        if (!banners) {
            throw new NotFoundException('No banner found');
        }

        return {
            campaign: this.transformCampaign(campaign),
            banners: this.transformBanner(banners)
        };
    }

    private transformCampaign(campaign: CampaignDocument | Record<string, any>) {
        const { _id, ...campaignData } = campaign as any;

        return {
            campaignName: campaignData.campaignName,
            startDate: campaignData.startDate,
            endDate: campaignData.endDate,
            id: _id.toString(),
        };
    }

    private transformBanner(Banner: CreativeDocument | Record<string, any>) {
        const { _id, ...banner } = Banner as any;

        return {
            name: banner.name,
            destinationUrl: banner.destinationUrl,
            file: banner.fileName,
            id: _id.toString(),
        };
    }

    private toObjectId(id: string): Types.ObjectId {
        if (!Types.ObjectId.isValid(id)) {
            throw new NotFoundException('Campaign not found');
        }

        return new Types.ObjectId(id);
    }

    // async findDraft(userId: string) {
    //     const campaign = await this.campaignModel
    //         .find({ userId, status: 'draft' })
    //         .sort({ updatedAt: -1 })
    //         .lean();
    //     console.log("campaign service findDraft", campaign)

    //     const transformedCampaign = campaign.map((c) => ({
    //         ...c.data,
    //         id: c._id.toString(),
    //         status: c.status,
    //         lastSavedAt: c.lastSavedAt,
    //     }));

    //     return transformedCampaign;
    // 

    async createDraft(dto: Partial<Campaign>, userId: string) {
        const organizationId = this.toObjectId(userId);
        const organization = await this.organizationModel.findById(organizationId).exec();
        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        const advertiser = await this.advertiserModel
            .findOne({ organizationId })
            .exec();
        if (!advertiser) {
            throw new NotFoundException('Advertiser not found for this organization');
        }
        if (advertiser.reviveAdvertiserId == null) {
            throw new NotFoundException('Advertiser is not linked to Revive');
        }

        // const startDate = new Date(dto?.startDate);
        // const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
        // if (endDate && endDate.getTime() <= startDate.getTime()) {
        //     throw new BadRequestException('End date must be after start date.');
        // }

        return this.campaignModel.create({
            organizationId,
            advertiserId: advertiser.reviveAdvertiserId,
            campaignName: dto.campaignName,
            startDate: dto.startDate,
            endDate: dto.endDate,
            status: dto.status ?? CampaignStatus.CREATED,
        });
    }

    async findDraftById(id: string, userId: string) {
        const organizationId = this.toObjectId(userId)
        const campaign = await this.campaignModel.findOne({ _id: id, organizationId }).lean();
        if (!campaign) {
            throw new NotFoundException('Draft not found');
        }

        return campaign;
    }

    async finalLaunch(campaignId: string) {
        const newCampaignId = new Types.ObjectId(campaignId)
        const campaign = await this.campaignModel.findById(newCampaignId);
        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }

        if (!campaign.reviveCampaignId) {
            throw new BadRequestException(
                'Campaign has not been synchronized with Revive',
            );
        }

        const creativeCount = await this.creativeModel.countDocuments({
            campaignId: campaign._id,
        });

        if (creativeCount === 0) {
            throw new BadRequestException(
                'Campaign needs at least one banner before it can launch',
            );
        }

        const { linked, failed } = await this.targetingService.applyAutomaticLinking(
            campaign._id as Types.ObjectId,
            campaign.reviveCampaignId,
        );

        if (linked === 0) {
            throw new BadRequestException(
                'No matching zones available — campaign not launched',
            );
        }

        campaign.status = CampaignStatus.CREATED;
        await campaign.save();

        return {
            status: campaign.status,
            zonesLinked: linked,
            zonesFailed: failed,
        };
    }
}
