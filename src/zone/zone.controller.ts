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
    constructor(private readonly zoneService: ZoneService) { }

    @Post(':publisherId')
    async create(
        @Param('publisherId') publisherId: string,
        @Body() dto: CreateZoneDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        console.log("zone", dto)
        return this.zoneService.create(dto, publisherId, user.userId);
    }
}
