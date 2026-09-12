import { ConflictException, Injectable } from '@nestjs/common';
import { CreateAdvertiserDto } from './dto/create-advertiser.dto';
import { AdvertisersRepository } from "./advertisers.repositpory";
import { Types } from 'mongoose';
import { ReviveService } from '../revive/revive.service';

@Injectable()
export class AdvertisersService {
    constructor(
        private readonly advertisersRepository: AdvertisersRepository,
        private readonly reviveService: ReviveService
    ) { }

    /**
     * Creates a new Advertiser in Revive
     */
    async createAdvertiser(dto: CreateAdvertiserDto, userId: string) {
        const organizationObjectId = new Types.ObjectId(userId);
        const existingAdvertiser = await this.advertisersRepository.findByOrganizationId(organizationObjectId);
        if (existingAdvertiser) {
            throw new ConflictException('Advertiser already exists for this organization');
        }

        try {
            const advertiserId = await this.reviveService.addAdvertiser(dto.name, dto.email);

            return await this.advertisersRepository.create({
                organizationId: organizationObjectId,
                name: dto.name,
                email: dto.email,
                reviveAdvertiserId: advertiserId
            });

        } catch (error) {
            throw error;
        }

    }

    async getAdvertiser(advertiserId: number): Promise<any> {
        return this.reviveService.getAdvertiser(advertiserId);
    }

    async getAdvertiserByOrganizationId(organizationId: string) {
        const organizationObjectId = new Types.ObjectId(organizationId);
        const advertiser = await this.advertisersRepository.findByOrganizationId(organizationObjectId);
        const transformedAdvertiser = advertiser ? {
            id: advertiser._id.toString(),
            name: advertiser.name,
            email: advertiser.email,
        } : null;
        return transformedAdvertiser;
    }
}
