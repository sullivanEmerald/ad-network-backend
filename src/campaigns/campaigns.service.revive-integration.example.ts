/**
 * Integration Example: Campaigns Service + Revive AdServer
 * 
 * This file demonstrates how to extend the CampaignsService to integrate
 * with Revive AdServer and publish campaigns to the ad network.
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { ReviveApiService } from '../ad-server/revive-api.service';

@Injectable()
export class CampaignsServiceWithRevive {
    constructor(
        @InjectModel(Campaign.name)
        private readonly campaignModel: Model<CampaignDocument>,
        private readonly reviveApiService: ReviveApiService,
    ) { }

    /**
     * Publish a campaign draft to Revive AdServer
     * 
     * This method:
     * 1. Validates the campaign draft is complete
     * 2. Transforms campaign data to Revive format
     * 3. Creates the campaign in Revive
     * 4. Updates the local campaign with Revive IDs for tracking
     * 
     * @param campaignId - Local campaign ID
     * @param accountId - Account owner
     */
    async publishCampaignToRevive(
        campaignId: string,
        accountId: string,
        accountName: string,
    ) {
        // Step 1: Load the draft campaign
        const campaign = await this.campaignModel.findOne({
            _id: campaignId,
            accountId,
            status: 'draft',
        });

        if (!campaign) {
            throw new Error(`Campaign ${campaignId} not found or not in draft state`);
        }

        // Step 2: Validate the campaign data has all required fields
        const campaignData = campaign.data as any;
        this.validateCampaignData(campaignData);

        try {
            // Step 3: Transform local campaign format to Revive API format
            const revivePayload = this.transformToReviveFormat(campaignData);

            // Step 4: Push to Revive
            const result = await this.reviveApiService.pushCampaignToRevive(
                accountId,
                accountName,
                revivePayload,
            );

            // Step 5: Update local campaign with Revive tracking IDs
            campaign.data = {
                ...campaignData,
                // Store Revive IDs for future reference/updates
                reviveCampaignId: result.reviveCampaignId,
                reviveBannerIds: result.reviveBannerIds,
                reviveAdvertiserId: result.reviveAdvertiserId,
            };
            campaign.status = 'active';
            await campaign.save();

            return {
                success: true,
                campaignId: campaign._id,
                reviveCampaignId: result.reviveCampaignId,
                reviveBannerIds: result.reviveBannerIds,
                message: 'Campaign successfully published to Revive AdServer',
            };
        } catch (error) {
            // Campaign is already rolled back in Revive if it was created
            // Update our local campaign status to reflect the failure
            campaign.data = {
                ...campaignData,
                publicationError: error.message,
            };
            await campaign.save();

            throw new BadRequestException(
                `Failed to publish campaign to Revive: ${error.message}`,
            );
        }
    }

    /**
     * Validate that a campaign has all required fields for Revive publishing
     */
    private validateCampaignData(data: any): void {
        const required = [
            'campaignName',
            'startDate',
            'budgetAmount',
            'budgetType',
            'clickThroughUrl',
            'assets',
            'placements',
            'advertiserId',
        ];

        const missing = required.filter((field) => !data[field]);
        if (missing.length > 0) {
            throw new BadRequestException(
                `Campaign is incomplete. Missing fields: ${missing.join(', ')}`,
            );
        }

        if (!Array.isArray(data.assets) || data.assets.length === 0) {
            throw new BadRequestException('Campaign must have at least one asset');
        }

        if (!Array.isArray(data.placements) || data.placements.length === 0) {
            throw new BadRequestException('Campaign must have at least one placement');
        }
    }

    /**
     * Transform local campaign format to Revive API format
     * 
     * Local format (from frontend):
     * {
     *   campaignName: "Summer 2024",
     *   startDate: "2024-06-01",
     *   endDate: "2024-08-31",
     *   budgetAmount: 5000,
     *   budgetType: "impression",
     *   clickThroughUrl: "https://example.com",
     *   assets: [
     *     { fileUrl: "...", width: 728, height: 90, type: "image" },
     *     { fileUrl: "...", width: 300, height: 250, type: "image" }
     *   ],
     *   placements: ["homepage-top", "sidebar"]
     * }
     * 
     * Revive format (from ReviveApiService):
     * {
     *   campaignName: "...",
     *   startDate: "...",
     *   budgetAmount: ...,
     *   budgetType: "impression",
     *   banners: [{ width, height, fileUrl, clickThroughUrl, bannerType }],
     *   zoneIds: [1, 2, 3]
     * }
     */
    private transformToReviveFormat(data: any) {
        return {
            advertiserId: data.advertiserId,
            campaignName: data.campaignName,
            startDate: this.formatDate(data.startDate),
            endDate: data.endDate ? this.formatDate(data.endDate) : undefined,
            budgetAmount: Number(data.budgetAmount),
            budgetType: data.budgetType,
            pacing: data.pacing || 'even',
            banners: (data.assets || []).map((asset: any) => ({
                width: asset.width,
                height: asset.height,
                fileUrl: asset.fileUrl,
                clickThroughUrl: data.clickThroughUrl,
                bannerName: asset.name || `Banner ${asset.width}x${asset.height}`,
                bannerType: asset.type || 'image',
            })),
            zoneIds: this.resolveZoneIds(data.placements || []),
        };
    }

    /**
     * Map placement names to Revive zone IDs
     * This is a mock implementation — in practice, you'd query a database
     * or call a mapping service that knows your site's placement structure
     */
    private resolveZoneIds(placements: string[]): number[] {
        const placementMap: Record<string, number> = {
            'homepage-top': 1,
            'homepage-sidebar': 2,
            'article-inline': 3,
            'footer-banner': 4,
        };

        return placements
            .map((placement) => placementMap[placement])
            .filter((id) => id !== undefined);
    }

    /**
     * Format date to Revive's expected format (YYYY-MM-DD)
     */
    private formatDate(date: Date | string): string {
        if (typeof date === 'string') {
            return date; // Assume already formatted
        }
        return date.toISOString().split('T')[0];
    }
}

/**
 * Usage in a controller:
 * 
 * POST /api/campaigns/:id/publish
 * 
 * @Post(':id/publish')
 * async publishCampaign(
 *   @Param('id') campaignId: string,
 *   @Body() { accountId, accountName }: PublishPayloadDto
 * ) {
 *   return this.campaignsService.publishCampaignToRevive(
 *     campaignId,
 *     accountId,
 *     accountName,
 *   );
 * }
 */
