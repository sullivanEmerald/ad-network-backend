
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
} from '@nestjs/common';

import { CreatePublisherDto } from './dto/create-publisher.dto';
import { PublishersService } from './publishers.service';

@Controller('publishers')
export class PublishersController {
    constructor(
        private readonly publishersService: PublishersService,
    ) { }

    @Post()
    async create(
        @Body() dto: CreatePublisherDto,
    ) {

        const organisationId = 'CURRENT_ORGANISATION_ID';
        const reviveAgencyId = 1;

        return this.publishersService.create(
            organisationId,
            reviveAgencyId,
            dto,
        );
    }

    @Get()
    async findAll() {
        const organisationId =
            'CURRENT_ORGANISATION_ID';

        return this.publishersService.findByOrganisation(
            organisationId,
        );
    }

    @Get(':publisherId')
    async findOne(
        @Param('publisherId') publisherId: string,
    ) {
        const organisationId =
            'CURRENT_ORGANISATION_ID';

        return this.publishersService.findOne(
            organisationId,
            publisherId,
        );
    }
}
