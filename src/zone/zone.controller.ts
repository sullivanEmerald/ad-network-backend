import {
    Body,
    Controller,
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

    @Post(':publisherId')
    async create(
        @Param('publisherId') publisherId: string,
        @Body() dto: CreateZoneDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        console.log("zone", dto)
        return this.zonesService.create(dto, publisherId, user.userId);
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
}
