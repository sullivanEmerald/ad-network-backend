
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
    Publisher,
    PublisherDocument,
    PublisherStatus,
} from './schemas/publisher.schema';

import { CreatePublisherDto } from './dto/create-publisher.dto';
import { ReviveService } from '../revive/revive.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PublishersService {
    constructor(
        @InjectModel(Publisher.name)
        private readonly publisherModel: Model<PublisherDocument>,
        private readonly reviveService: ReviveService,
        private readonly organisationalService: UsersService
    ) { }

    async create(
        dto: CreatePublisherDto,
        userId: string,
    ) {

        const organisationalProfile = await this.organisationalService.findOrganisationById(userId)

        if (!organisationalProfile) {
            throw new BadRequestException("Organisational is not registered with us")
        }

        let revivePublisherId: number;

        try {
            revivePublisherId =
                await this.reviveService.addPublisher({
                    agencyId: organisationalProfile.reviveAgencyId,

                    publisherName: dto.name,

                    contactName: dto.contactName,

                    emailAddress: dto.emailAddress,

                    website: dto.website,

                    comments: dto.comments,
                });
        } catch (error) {
            throw new BadRequestException(
                'Publisher could not be created in the ad server',
            );
        }
        const publisher =
            await this.publisherModel.create({
                organisationId: new Types.ObjectId(
                    userId,
                ),

                name: dto.name,

                website: dto.website,

                contactName: dto.contactName,

                emailAddress: dto.emailAddress,

                reviveAgencyId: organisationalProfile.reviveAgencyId,

                revivePublisherId,

                status: PublisherStatus.ACTIVE,

                comments: dto.comments,
            });

        return publisher;
    }

    async findByOrganisation(userId: string) {
        const organisationId = new Types.ObjectId(userId)
        const organisationalPublishers = await this.publisherModel
            .find({ organisationId })
            .sort({ createdAt: -1 })
            .lean();

        return organisationalPublishers.map((publisher) => ({
            id: publisher._id.toString(),
            name: publisher.name,
            contactName: publisher.contactName,
            emailAddress: publisher.emailAddress,
            website: publisher.website,
        }));
    }

    async findOne(
        organisationId: string,
        publisherId: string,
    ) {
        if (!Types.ObjectId.isValid(publisherId)) {
            throw new BadRequestException(
                'Invalid publisher ID',
            );
        }

        const publisher =
            await this.publisherModel.findOne({
                _id: publisherId,
                organisationId,
            });

        if (!publisher) {
            throw new NotFoundException(
                'Publisher not found',
            );
        }

        return publisher;
    }
}

