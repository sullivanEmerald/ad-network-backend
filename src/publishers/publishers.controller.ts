
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards
} from '@nestjs/common';

import { CreatePublisherDto } from './dto/create-publisher.dto';
import { PublishersService } from './publishers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt/jwt-payload.interface';
import { CreateZoneDto } from '../zone/dto/create-zone.dto';

@UseGuards(JwtAuthGuard)
@Controller('publishers')
export class PublishersController {
    constructor(
        private readonly publishersService: PublishersService,
    ) { }

    @Post()
    async create(
        @Body() dto: CreatePublisherDto,
        @CurrentUser() user: any
    ) {
        return this.publishersService.create(
            dto,
            user.userId
        );
    }

    @Get()
    async findAll(@CurrentUser() user: any) {

        return this.publishersService.findByOrganisation(
            user.userId,
        );
    }

    @Get(':publisherId')
    async findOne(
        @Param('publisherId') publisherId: string,
        @CurrentUser() user: any
    ) {

        return this.publishersService.findOne(
            user.userId,
            publisherId,
        );
    }

    // @Post()
    // async createZone(
    //     @Body() dto: CreateZoneDto,
    //     @CurrentUser() user: any
    // ) {
    //     return this.publishersService.createZone(
    //         dto,
    //         user.userId
    //     );
    // }

}
