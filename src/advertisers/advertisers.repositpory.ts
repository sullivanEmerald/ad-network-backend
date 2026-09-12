import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    Advertiser,
    AdvertiserDocument,
} from './schema/advertiser.schema';

@Injectable()
export class AdvertisersRepository {
    constructor(
        @InjectModel(Advertiser.name)
        private readonly advertiserModel: Model<AdvertiserDocument>,
    ) { }

    async findById(
        id: string | Types.ObjectId,
    ): Promise<AdvertiserDocument | null> {
        return this.advertiserModel.findById(id).exec();
    }

    async findByOrganizationId(
        organizationId: string | Types.ObjectId,
    ): Promise<AdvertiserDocument | null> {
        return this.advertiserModel
            .findOne({ organizationId })
            .exec();
    }

    async create(data: {
        organizationId: Types.ObjectId;
        name: string;
        email: string;
        reviveAdvertiserId: number
    }): Promise<AdvertiserDocument> {
        const advertiser = new this.advertiserModel(data);

        return advertiser.save();
    }

    async update(
        id: string | Types.ObjectId,
        data: Partial<Advertiser>,
    ): Promise<AdvertiserDocument | null> {
        return this.advertiserModel
            .findByIdAndUpdate(
                id,
                {
                    $set: data,
                },
                {
                    new: true,
                    runValidators: true,
                },
            )
            .exec();
    }

    async delete(
        id: string | Types.ObjectId,
    ): Promise<void> {
        await this.advertiserModel
            .findByIdAndDelete(id)
            .exec();
    }
}