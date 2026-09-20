import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { LaunchCampaignDto } from './dto/campaign.dto';
import { CreateDraftCampaignDto } from './dto/update-campaign.dto';
import { Campaign } from './schemas/campaign.schema';


@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Post()
    create(@Body() dto: LaunchCampaignDto, @CurrentUser() user: any) {
        console.log("launch dto", dto)
        return this.campaignsService.lanuchCampaign(dto, user.userId);
    }

    @Get()
    getCampaigns(@CurrentUser() user: any) {
        return this.campaignsService.getCampaigns(user.userId);
    }

    @Get(':campaignId/summary')
    getCampaignSummary(
        @Param('campaignId') campaignId: string,
        @CurrentUser() user: any,
    ) {
        return this.campaignsService.getCampaignSummary(campaignId, user.userId);
    }

    @Get(':id')
    getCampaignById(@Param('id') id: string, @CurrentUser() user: any) {
        return this.campaignsService.getCampaignById(id, user.userId);
    }

    @Post('drafts')
    async saveDraft(@Body() dto: Partial<Campaign>, @CurrentUser() user: any) {
        console.log("draft dto", dto)
        const campaign = await this.campaignsService.createDraft(dto, user.userId);
        return campaign;
    }

    // @Get('drafts')
    // findDrafts(@CurrentUser() user: any) {
    //     const drafts = this.campaignsService.findDraft(user.userId);
    //     console.log('drafts', drafts)
    //     return drafts;
    // }

    @Get('drafts/:id')
    async findDraftById(@Param('id') id: string, @CurrentUser() user: any) {
        console.log('fetching draft', id)
        const campaign = await this.campaignsService.findDraftById(id, user.userId);
        return campaign;
    }

    @Patch(':campaignId/launch')
    async launchCampaign(@Param('campaignId') campaignId: string) {
        return this.campaignsService.finalLaunch(campaignId)
    }

}