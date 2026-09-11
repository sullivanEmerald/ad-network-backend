import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';
import { CreateAdvertiserDto } from "./dto/create-advertiser.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller('advertisers')
export class AdvertisersController {
    constructor(private readonly advertisersService: AdvertisersService) { }

    @Post()
    async create(
        @Body()
        dto: CreateAdvertiserDto,
        @CurrentUser() user: any
    ) {
        console.log("advertisers controller create", dto, user)
        return await this.advertisersService.createAdvertiser(dto, user.userId);

    }

    @Get()
    async getAdvertiserByOrganizationId(@CurrentUser() user: any) {
        const advertiser = await this.advertisersService.getAdvertiserByOrganizationId(user.userId);
        return { success: true, advertiser };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const advertiser = await this.advertisersService.getAdvertiser(Number(id));
        return { success: true, advertiser };
    }
}
