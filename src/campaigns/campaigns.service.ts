import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument, CampaignStatus as CampaignDbStatus } from './schemas/campaign.schema';
import { Advertiser, AdvertiserDocument } from '../advertisers/schema/advertiser.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LaunchCampaignDto } from './dto/campaign.dto';
import { ReviveService } from '../revive/revive.service';

@Injectable()
export class CampaignsService {
    constructor(
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<CampaignDocument>,
        @InjectModel(Advertiser.name)
        private readonly advertiserModel: Model<AdvertiserDocument>,
        @InjectModel(User.name)
        private readonly organizationModel: Model<UserDocument>,
        private readonly reviveService: ReviveService
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
        const campaignId = await this.reviveService.addCampaign({
            advertiserId: advertiser.reviveAdvertiserId,
            campaignName: dto.campaignName,
            startDate: startDate,
            endDate: endDate

        });

        return this.campaignModel.create({
            organizationId: organisationalId,
            advertiserId: advertiser._id,
            campaignName: dto.campaignName,
            objective: dto.objective,
            geo: dto.geo,
            devices: dto.devices,
            budgetType: dto.budgetType,
            budgetAmount: dto.budgetAmount,
            startDate,
            endDate,
            draftId: dto.draftId ?? null,
            pacing: dto.pacing,
            status: dto.status === 'active'
                ? CampaignDbStatus.ACTIVE
                : CampaignDbStatus.DRAFT,
            reviveCampaignId: campaignId,
        });

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
    // }

    // async createDraft(dto: CreateDraftCampaignDto, userId: string) {
    //     const status: 'draft' | 'active' = dto.status as 'draft' | 'active';
    //     const existingDraft = await this.campaignModel.findOne({ _id: dto.draftId, userId, status: 'draft' });
    //     if (existingDraft) {
    //         return this.campaignModel.findOneAndUpdate(
    //             { _id: existingDraft._id },
    //             { $set: { data: dto.data ?? {}, status, lastSavedAt: new Date() } },
    //             { new: true }
    //         );
    //     }
    //     return this.campaignModel.create({
    //         data: dto.data ?? {},
    //         userId,
    //         status,
    //         lastSavedAt: new Date(),
    //     });
    // }

    // async findDraftById(id: string, userId: string) {
    //     const campaign = await this.campaignModel.findOne({ _id: id, userId, status: 'draft' }).lean();
    //     if (!campaign) {
    //         throw new NotFoundException('Draft not found');
    //     }
    //     const transformedCampaign = {
    //         ...campaign.data,
    //     };
    //     return transformedCampaign;
    // }
}
