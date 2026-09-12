import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateDraftCampaignDto } from './dto/update-campaign.dto';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';

@Injectable()
export class CampaignsService {
    constructor(
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<CampaignDocument>,
    ) { }

    async lanuchCampaign(dto: CreateDraftCampaignDto, userId: string) {
        const status: 'draft' | 'active' = dto.status as 'draft' | 'active';
        const existingDraft = await this.campaignModel.findOne({ _id: dto.draftId, userId, status: 'draft' });
        if (existingDraft) {
            return this.campaignModel.findOneAndUpdate(
                { _id: existingDraft._id },
                { $set: { data: dto.data ?? {}, status, lastSavedAt: new Date() } },
                { new: true }
            );
        }
        return this.campaignModel.create({
            data: dto.data ?? {},
            userId,
            status,
            lastSavedAt: new Date(),
        });
    }

    async findDraft(userId: string) {
        const campaign = await this.campaignModel
            .find({ userId, status: 'draft' })
            .sort({ updatedAt: -1 })
            .lean();
        console.log("campaign service findDraft", campaign)

        const transformedCampaign = campaign.map((c) => ({
            ...c.data,
            id: c._id.toString(),
            status: c.status,
            lastSavedAt: c.lastSavedAt,
        }));

        return transformedCampaign;
    }

    async createDraft(dto: CreateDraftCampaignDto, userId: string) {
        const status: 'draft' | 'active' = dto.status as 'draft' | 'active';
        const existingDraft = await this.campaignModel.findOne({ _id: dto.draftId, userId, status: 'draft' });
        if (existingDraft) {
            return this.campaignModel.findOneAndUpdate(
                { _id: existingDraft._id },
                { $set: { data: dto.data ?? {}, status, lastSavedAt: new Date() } },
                { new: true }
            );
        }
        return this.campaignModel.create({
            data: dto.data ?? {},
            userId,
            status,
            lastSavedAt: new Date(),
        });
    }

    async findDraftById(id: string, userId: string) {
        const campaign = await this.campaignModel.findOne({ _id: id, userId, status: 'draft' }).lean();
        if (!campaign) {
            throw new NotFoundException('Draft not found');
        }
        const transformedCampaign = {
            ...campaign.data,
        };
        return transformedCampaign;
    }
}