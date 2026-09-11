import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Post,
    UseFilters,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ReviveApiService, ReviveZone, PushResult } from './revive-api.service';
import { PublishCampaignToReviveDto } from './dto/publish-campaign-to-revive.dto';

/**
 * AdServerController
 * 
 * Provides REST endpoints for ad server management operations
 */
@Controller('api/ad-server')
export class AdServerController {
    private readonly logger = new Logger(AdServerController.name);

    constructor(private readonly reviveApiService: ReviveApiService) { }

    /**
     * Publish a complete campaign to Revive AdServer
     * 
     * This endpoint orchestrates the full campaign creation flow:
     * - Creates/finds the advertiser
     * - Creates the campaign
     * - Creates all banners
     * - Links campaign to zones
     * 
     * POST /api/ad-server/campaigns/publish
     */
    @Post('campaigns/publish')
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ValidationPipe({ transform: true }))
    async publishCampaign(
        @Body() payload: PublishCampaignToReviveDto & { accountId: string; accountName: string },
    ): Promise<{ success: boolean; data: PushResult; message: string }> {
        try {
            this.logger.log(
                `Publishing campaign "${payload.campaignName}" for account ${payload.accountId}`,
            );

            const result = await this.reviveApiService.pushCampaignToRevive(
                payload.accountId,
                payload.accountName,
                {
                    campaignName: payload.campaignName,
                    startDate: payload.startDate,
                    endDate: payload.endDate,
                    budgetAmount: payload.budgetAmount,
                    budgetType: payload.budgetType,
                    pacing: payload.pacing,
                    banners: payload.banners.map((banner) => ({
                        width: banner.width,
                        height: banner.height,
                        fileUrl: banner.fileUrl,
                        clickThroughUrl: payload.clickThroughUrl,
                        bannerName: banner.bannerName,
                        bannerType: banner.bannerType || 'html',
                    })),
                    zoneIds: payload.zoneIds,
                },
            );

            this.logger.log(
                `Successfully published campaign: ${result.reviveCampaignId}`,
            );

            return {
                success: true,
                data: result,
                message: `Campaign published with ID ${result.reviveCampaignId}`,
            };
        } catch (error) {
            this.logger.error('Failed to publish campaign', error);
            throw error;
        }
    }

    /**
     * Get health status of Revive AdServer connection
     * 
     * GET /api/ad-server/health
     */
    @Get('health')
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        const isHealthy = await this.reviveApiService.healthCheck();

        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * List all available zones (placements) in Revive
     * 
     * GET /api/ad-server/zones
     */
    @Get('zones')
    async listZones() {
        try {
            // Create temporary session just for this query
            const session = await this.reviveApiService.authenticate();

            try {
                const zones = await this.reviveApiService.getZones(session.sessionId);

                return {
                    success: true,
                    data: zones,
                    count: zones.length,
                };
            } finally {
                await this.reviveApiService.logoff();
            }
        } catch (error) {
            this.logger.error('Failed to list zones', error);
            throw error;
        }
    }
}
