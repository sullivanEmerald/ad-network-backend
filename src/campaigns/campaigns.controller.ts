import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateDraftCampaignDto } from './dto/update-campaign.dto';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { LaunchCampaignDto } from './dto/campaign.dto';

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Post()
    create(@Body() dto: LaunchCampaignDto, @CurrentUser() user: any) {
        console.log("launch dto", dto)
        return this.campaignsService.lanuchCampaign(dto, user.userId);
    }

    // @Get('drafts')
    // findDrafts(@CurrentUser() user: any) {
    //     const drafts = this.campaignsService.findDraft(user.userId);
    //     console.log('drafts', drafts)
    //     return drafts;
    // }

    // @Get('drafts/:id')
    // async findDraftById(@Param('id') id: string, @CurrentUser() user: any) {
    //     const campaign = await this.campaignsService.findDraftById(id, user.userId);
    //     return campaign;
    // }

    // @Post('drafts')
    // async saveDraft(@Body() dto: CreateDraftCampaignDto, @CurrentUser() user: any) {
    //     console.log('dto', dto)
    //     const campaign = await this.campaignsService.createDraft(dto, user.userId);
    //     console.log('campaign', campaign)
    //     return campaign;
    // }

}