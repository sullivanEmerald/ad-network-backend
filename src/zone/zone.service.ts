import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Publisher, PublisherDocument } from '../publishers/schemas/publisher.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ReviveService } from '../revive/revive.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { Zone, ZoneDocument, ZoneStatus } from './schema/zone.schema';
import {
    CampaignZoneLink,
    LinkStatus,
} from '../campaigns/schemas/campaign-zone.link';
import { PublisherUserDocument } from '../publishers/schemas/publisher.schema';
import { TargetingService } from '../campaigns/targeting.service';


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

        return this.targetingService.findEligibleCampaignsForZone(zone, zoneId)

    }
}
