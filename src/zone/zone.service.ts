import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Publisher, PublisherDocument } from '../publishers/schemas/publisher.schema';
import { ReviveService } from '../revive/revive.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { Zone, ZoneDocument, ZoneStatus } from './schema/zone.schema';

@Injectable()
export class ZoneService {
    constructor(
        @InjectModel(Zone.name)
        private readonly zoneModel: Model<ZoneDocument>,
        @InjectModel(Publisher.name)
        private readonly publisherModel: Model<PublisherDocument>,
        private readonly reviveService: ReviveService,
    ) { }

    async create(
        dto: CreateZoneDto,
        publisherId: string,
        organisationId: string,
    ) {
        const publisher = await this.publisherModel
            .findOne({
                _id: publisherId,
                organisationId,
            })
            .exec();

        if (!publisher) {
            throw new NotFoundException('Publisher not found');
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
            throw new BadRequestException(
                'Zone not successfully created in the ad server',
            );
        }

        return this.zoneModel.create({
            publisherId: new Types.ObjectId(publisherId),
            name: dto.name,
            type: dto.type,
            width: dto.width,
            height: dto.height,
            comments: dto.comments,
            reviveZoneId: reviveZoneId,
            status: ZoneStatus.ACTIVE,
        });
    }
}
