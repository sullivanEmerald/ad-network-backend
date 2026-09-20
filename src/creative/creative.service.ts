import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    Creative,
    CreativeDocument,
    CreativeStatus,
    CreativeType,
} from './schema/creative.schema';

import { CreateCreativeDto } from './dto/create-creative.dto';
import { ReviveService } from '../revive/revive.service';
import { UploadedImageFile } from './types/creative.types';

import {
    Campaign,
    CampaignDocument,
} from '../campaigns/schemas/campaign.schema';

@Injectable()
export class CreativeService {
    constructor(
        @InjectModel(Creative.name)
        private readonly creativeModel: Model<CreativeDocument>,

        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<CampaignDocument>,

        private readonly reviveService: ReviveService,
    ) { }

    async create(
        campaignId: string,
        dto: CreateCreativeDto,
        file: UploadedImageFile,
    ): Promise<unknown> {
        if (!Types.ObjectId.isValid(campaignId)) {
            throw new BadRequestException('Invalid campaign ID');
        }

        if (!file) {
            throw new BadRequestException('Creative image is required');
        }

        const campaign = await this.campaignModel.findById(campaignId);

        if (!campaign) {
            throw new NotFoundException('Campaign not found');
        }

        if (!campaign.reviveCampaignId) {
            throw new BadRequestException(
                'Campaign has not been synchronized with Revive',
            );
        }

        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Only JPEG, PNG, GIF and WebP images are supported',
            );
        }

        let reviveBannerId: number;

        try {
            reviveBannerId = await this.reviveService.addBanner({
                campaignId: campaign.reviveCampaignId,
                bannerName: dto.name,
                imageFilename: file.originalname,
                imageContent: file.buffer,
                destinationUrl: dto.destinationUrl,
            });
        } catch (error) {
            throw new BadRequestException(
                'Creative could not be created in the ad server',
            );
        }

        const creative = await this.creativeModel.create({
            campaignId: campaign._id,
            reviveCampaignId: campaign.reviveCampaignId,
            name: dto.name,
            type: CreativeType.IMAGE,
            destinationUrl: dto.destinationUrl,
            fileName: file.originalname,
            mimeType: file.mimetype,
            width: undefined,
            height: undefined,
            reviveBannerId,
            reviveStorageType: 'web',
            status: CreativeStatus.ACTIVE,
        });

        return {
            ...creative,
            campaignId: campaign._id,
        };
    }

    async getBanners(campaignId: string) {
        const id = new Types.ObjectId(campaignId)
        return this.creativeModel.find({ campaignId: id }).sort({ createdAt: -1 })
            .lean();
    }
}

