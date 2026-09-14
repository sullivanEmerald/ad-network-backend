
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

@Injectable()
export class PublishersService {
    constructor(
        @InjectModel(Publisher.name)
        private readonly publisherModel: Model<PublisherDocument>,

        private readonly reviveService: ReviveService,
    ) { }

    async create(
        organisationId: string,
        reviveAgencyId: number,
        dto: CreatePublisherDto,
    ) {
        if (!Types.ObjectId.isValid(organisationId)) {
            throw new BadRequestException(
                'Invalid organisation ID',
            );
        }

        /**
         * Prevent duplicate publisher names for the same
         * organisation.
         */
        const existingPublisher =
            await this.publisherModel.findOne({
                organisationId,
                name: dto.name,
            });

        if (existingPublisher) {
            throw new BadRequestException(
                'A publisher with this name already exists',
            );
        }

        /**
         * Create publisher in Revive first.
         */
        let revivePublisherId: number;

        try {
            revivePublisherId =
                await this.reviveService.addPublisher({
                    agencyId: reviveAgencyId,

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

        /**
         * Persist Custex representation only after
         * Revive succeeds.
         */
        const publisher =
            await this.publisherModel.create({
                organisationId: new Types.ObjectId(
                    organisationId,
                ),

                name: dto.name,

                website: dto.website,

                contactName: dto.contactName,

                emailAddress: dto.emailAddress,

                reviveAgencyId,

                revivePublisherId,

                status: PublisherStatus.ACTIVE,

                comments: dto.comments,
            });

        return publisher;
    }

    async findByOrganisation(
        organisationId: string,
    ) {
        return this.publisherModel
            .find({
                organisationId,
            })
            .sort({
                createdAt: -1,
            })
            .lean();
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

