import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt/jwt-payload.interface';
import { CreateZoneDto } from './dto/create-zone.dto';
import { ZoneService } from './zone.service';

@UseGuards(JwtAuthGuard)
@Controller('zone')
export class ZoneController {
    constructor(private readonly zonesService: ZoneService) { }

    @Get()
    async findPublisherZones(@CurrentUser() user: AuthenticatedUser) {
        return this.zonesService.findByPublisherId(user.userId);
    }

    @Post()
    async create(
        @Body() dto: CreateZoneDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        console.log("zone", dto)
        console.log("publisherId", user.userId)
        return this.zonesService.create(dto, user.userId);
    }

    @Post(':zoneId/tag')
    async generateTag(
        @Param('zoneId') zoneId: string,
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: { codeType?: string },
    ) {
        console.log(dto)
        return this.zonesService.generateTag(
            zoneId,
            user.userId,
            dto.codeType,
        );
    }

    @Get("campaigns/:zoneId")
    async getZoneCampaigns(
        @Param("zoneId") zoneId: string,
    ) {
        return this.zonesService.getZoneCampaigns(zoneId)
    }
}
