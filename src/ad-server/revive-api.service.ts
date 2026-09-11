import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as xmlrpc from 'xmlrpc';
import axios from 'axios';

/**
 * Revive XML-RPC API Interface
 * Comprehensive type definitions for Revive Adserver entities and responses
 */

export interface ReviveConfig {
  host: string;
  path: string;
  username: string;
  password: string;
  useSsl: boolean;
  port: number;
  requestTimeout: number;
  maxRetries: number;
}

export interface ReviveSession {
  client: xmlrpc.Client;
  sessionId: string;
  createdAt: Date;
}

export interface ReviveAdvertiser {
  advertiserId: number;
  advertiserName: string;
  agencyId: number;
}

export interface ReviveCampaign {
  campaignId: number;
  advertiserId: number;
  campaignName: string;
  startDate: string;
  endDate?: string;
  budgetAmount: number;
  budgetType: 'impression' | 'click' | 'conversion';
  pacing?: string;
  status: 'active' | 'inactive' | 'deleted';
}

export interface ReviveBanner {
  bannerId: number;
  campaignId: number;
  bannerName: string;
  bannerType: string;
  width: number;
  height: number;
  fileUrl: string;
  clickThroughUrl: string;
  status: 'active' | 'inactive';
}

export interface ReviveZone {
  zoneId: number;
  zoneName: string;
  zoneType: string;
  width: number;
  height: number;
}

export interface CampaignPayload {
  advertiserId?: number;
  campaignName: string;
  startDate: string;
  endDate?: string;
  budgetAmount: number;
  budgetType: 'impression' | 'click' | 'conversion';
  pacing?: string;
}

export interface BannerPayload {
  campaignId?: number;
  bannerName?: string;
  bannerType: string;
  width: number;
  height: number;
  fileUrl: string;
  clickThroughUrl: string;
}

export interface PushResult {
  reviveCampaignId: number;
  reviveBannerIds: number[];
  reviveAdvertiserId: number;
}

/**
 * ReviveApiService
 * 
 * Production-grade XML-RPC client for Revive Adserver integration.
 * 
 * Key design patterns:
 * - Session-based authentication with guaranteed cleanup
 * - Automatic retry logic with exponential backoff
 * - Comprehensive error handling and validation
 * - Transactional campaign creation with rollback
 * - Type-safe API calls with structured responses
 */
@Injectable()
export class ReviveApiService {
  private readonly logger = new Logger(ReviveApiService.name);
  private config: ReviveConfig;
  private session: ReviveSession | null = null;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
  }

  /**
   * Load and validate Revive configuration from environment variables
   */
  private loadConfig(): ReviveConfig {
    const host = this.configService.get<string>('REVIVE_HOST');
    const username = this.configService.get<string>('REVIVE_USERNAME');
    const password = this.configService.get<string>('REVIVE_PASSWORD');

    if (!host || !username || !password) {
      throw new Error(
        'Missing Revive AdServer configuration. Ensure REVIVE_HOST, REVIVE_USERNAME, and REVIVE_PASSWORD are set.'
      );
    }

    return {
      host,
      username,
      password,
      path: this.configService.get<string>('REVIVE_API_PATH', '/www/api/v2/xmlrpc/'),
      useSsl: this.configService.get<boolean>('REVIVE_USE_SSL', true),
      port: this.configService.get<number>('REVIVE_PORT', 443),
      requestTimeout: this.configService.get<number>('REVIVE_REQUEST_TIMEOUT', 30000),
      maxRetries: this.configService.get<number>('REVIVE_MAX_RETRIES', 3),
    };
  }

  /**
   * Create a new XML-RPC client with configured connection parameters
   */
  private createClient(): xmlrpc.Client {
    const { host, path, port, useSsl } = this.config;

    const factory = useSsl ? xmlrpc.createSecureClient : xmlrpc.createClient;

    return factory({
      host,
      path,
      port,
    });
  }

  /**
   * Wrapper for XML-RPC method calls with type safety and retry logic
   */
  private async callReviveMethod<T>(
    client: xmlrpc.Client,
    method: string,
    params: unknown[],
    retryCount = 0,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      client.methodCall(method, params, async (err, value) => {
        if (err) {
          // Retry on transient network errors
          if (
            retryCount < this.config.maxRetries &&
            this.isRetryableError(err)
          ) {
            this.logger.warn(
              `Retrying ${method} (attempt ${retryCount + 1}/${this.config.maxRetries})`,
              err instanceof Error ? err.message : String(err),
            );
            await this.exponentialBackoff(retryCount);
            return resolve(
              await this.callReviveMethod<T>(client, method, params, retryCount + 1),
            );
          }

          this.logger.error(
            `Revive API call failed: ${method}`,
            err instanceof Error ? err.message : String(err),
          );
          reject(this.transformReviveError(err));
        } else {
          resolve(value as T);
        }
      });
    });
  }

  /**
   * Determine if an error is retryable (transient vs permanent)
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    const retryablePatterns = [
      'econnrefused',
      'econnreset',
      'etimedout',
      'ehostunreach',
      'enetunreach',
      'temporary',
      'timeout',
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Exponential backoff with jitter
   */
  private async exponentialBackoff(retryCount: number): Promise<void> {
    const baseDelay = 100;
    const maxDelay = 5000;
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    const jitter = Math.random() * delay * 0.1;

    return new Promise((resolve) =>
      setTimeout(resolve, delay + jitter),
    );
  }

  /**
   * Transform Revive API errors into appropriate NestJS HTTP exceptions
   */
  private transformReviveError(error: any): Error {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('unauthorized') || message.includes('invalid login')) {
      return new UnauthorizedException(
        'Invalid Revive AdServer credentials',
      );
    }

    if (
      message.includes('refused') ||
      message.includes('unreachable') ||
      message.includes('timeout')
    ) {
      return new ServiceUnavailableException(
        'Revive AdServer is currently unavailable',
      );
    }

    if (message.includes('bad parameter') || message.includes('invalid')) {
      return new BadRequestException(
        `Invalid request to Revive AdServer: ${error.message}`,
      );
    }

    return new InternalServerErrorException(
      `Unexpected Revive AdServer error: ${error.message}`,
    );
  }

  /**
   * Authenticate with Revive AdServer and create a new session
   */
  async authenticate(): Promise<ReviveSession> {
    try {
      const client = this.createClient();
      const sessionId = await this.callReviveMethod<string>(
        client,
        'ox.logon',
        [this.config.username, this.config.password],
      );

      this.session = {
        client,
        sessionId,
        createdAt: new Date(),
      };

      this.logger.log('Successfully authenticated with Revive AdServer');
      return this.session;
    } catch (error) {
      this.logger.error('Failed to authenticate with Revive AdServer', error);
      throw error;
    }
  }

  /**
   * Close the current session
   */
  async logoff(): Promise<void> {
    if (!this.session) {
      return;
    }

    try {
      await this.callReviveMethod<boolean>(this.session.client, 'ox.logoff', [
        this.session.sessionId,
      ]);
      this.logger.log('Successfully logged off from Revive AdServer');
      this.session = null;
    } catch (error) {
      this.logger.warn('Failed to logoff from Revive AdServer', error);
      this.session = null;
    }
  }

  /**
   * Ensure a valid session exists, creating one if necessary
   */
  private async ensureSession(): Promise<ReviveSession> {
    if (this.session) {
      return this.session;
    }
    return this.authenticate();
  }

  /**
   * Execute a function within a guaranteed session context with cleanup
   */
  private async withSession<T>(
    fn: (session: ReviveSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.ensureSession();
    try {
      return await fn(session);
    } finally {
      await this.logoff();
    }
  }

  /**
   * Find or create an advertiser in Revive
   * Uses accountId as idempotency key to prevent duplicates
   */
  async findOrCreateAdvertiser(
    sessionId: string,
    accountId: string,
    accountName: string,
    client?: xmlrpc.Client,
  ): Promise<ReviveAdvertiser> {
    const reviveClient = client || this.session?.client;
    if (!reviveClient) {
      throw new InternalServerErrorException('No active Revive session');
    }

    try {
      // List existing advertisers to check for duplicates
      const existingAdvertisers = await this.callReviveMethod<any[]>(
        reviveClient,
        'ox.getAdvertiserListByAgencyId',
        [sessionId, 0], // agency 0 = default
      );

      // Search for existing advertiser by reference or comment (idempotency key)
      const existing = (existingAdvertisers || []).find(
        (advertiser) =>
          advertiser.reference === accountId ||
          advertiser.comments === accountId,
      );

      if (existing) {
        this.logger.log(
          `Found existing advertiser: ${existing.advertiserId} for account ${accountId}`,
        );
        return {
          advertiserId: Number(existing.advertiserId),
          advertiserName: existing.advertiserName,
          agencyId: Number(existing.agencyId),
        };
      }

      // Create new advertiser
      const advertiserId = await this.callReviveMethod<number>(
        reviveClient,
        'ox.addAdvertiser',
        [
          sessionId,
          {
            agencyId: 0,
            advertiserName: accountName,
            advertiserEmail: 'noreply@adserver.local',
            reference: accountId, // Idempotency key
            comments: accountId,
            status: 1, // 1 = active
          },
        ],
      );

      this.logger.log(
        `Created new advertiser: ${advertiserId} for account ${accountId}`,
      );

      return {
        advertiserId,
        advertiserName: accountName,
        agencyId: 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find or create advertiser for account ${accountId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a campaign in Revive with the provided payload
   */
  async createCampaign(
    sessionId: string,
    payload: CampaignPayload,
    client?: xmlrpc.Client,
  ): Promise<number> {
    const reviveClient = client || this.session?.client;
    if (!reviveClient) {
      throw new InternalServerErrorException('No active Revive session');
    }

    try {
      const campaignData = {
        advertiserId: payload.advertiserId,
        campaignName: payload.campaignName,
        startDate: payload.startDate, // "YYYY-MM-DD"
        endDate: payload.endDate || null,
        budgetAmount: payload.budgetAmount,
        budgetType: payload.budgetType, // 'impression', 'click', or 'conversion'
        pacing: payload.pacing || 'even', // Pacing strategy
        status: 1, // 1 = active
        priority: 0,
      };

      const campaignId = await this.callReviveMethod<number>(
        reviveClient,
        'ox.addCampaign',
        [sessionId, campaignData],
      );

      this.logger.log(
        `Created campaign: ${campaignId} for advertiser ${payload.advertiserId}`,
      );

      return campaignId;
    } catch (error) {
      this.logger.error(
        `Failed to create campaign for advertiser ${payload.advertiserId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a banner (ad creative) in a campaign
   */
  async createBanner(
    sessionId: string,
    payload: BannerPayload,
    client?: xmlrpc.Client,
  ): Promise<number> {
    const reviveClient = client || this.session?.client;
    if (!reviveClient) {
      throw new InternalServerErrorException('No active Revive session');
    }

    try {
      const bannerData = {
        campaignId: payload.campaignId,
        bannerName: payload.bannerName || `Banner ${payload.width}x${payload.height}`,
        bannerType: payload.bannerType || 'html', // 'html', 'image', 'swf', etc.
        width: payload.width,
        height: payload.height,
        fileUrl: payload.fileUrl,
        clickThroughUrl: payload.clickThroughUrl,
        status: 1, // 1 = active
        weight: 1,
      };

      const bannerId = await this.callReviveMethod<number>(
        reviveClient,
        'ox.addBanner',
        [sessionId, bannerData],
      );

      this.logger.log(
        `Created banner: ${bannerId} for campaign ${payload.campaignId}`,
      );

      return bannerId;
    } catch (error) {
      this.logger.error(
        `Failed to create banner for campaign ${payload.campaignId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Link a campaign to one or more zones (placements)
   * Establishes the advertiser's targeting for where ads will be displayed
   */
  async linkCampaignToZones(
    sessionId: string,
    campaignId: number,
    zoneIds: number[],
    client?: xmlrpc.Client,
  ): Promise<void> {
    const reviveClient = client || this.session?.client;
    if (!reviveClient) {
      throw new InternalServerErrorException('No active Revive session');
    }

    if (zoneIds.length === 0) {
      throw new BadRequestException('No zones provided for campaign linking');
    }

    try {
      for (const zoneId of zoneIds) {
        // Link each zone individually
        await this.callReviveMethod<boolean>(
          reviveClient,
          'ox.linkCampaignToZone',
          [sessionId, campaignId, zoneId],
        );
      }

      this.logger.log(
        `Linked campaign ${campaignId} to ${zoneIds.length} zones`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to link campaign ${campaignId} to zones`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a campaign (used for rollback on partial failures)
   */
  async deleteCampaign(
    sessionId: string,
    campaignId: number,
    client?: xmlrpc.Client,
  ): Promise<void> {
    const reviveClient = client || this.session?.client;
    if (!reviveClient) {
      throw new InternalServerErrorException('No active Revive session');
    }

    try {
      await this.callReviveMethod<boolean>(reviveClient, 'ox.deleteCampaign', [
        sessionId,
        campaignId,
      ]);

      this.logger.warn(`Deleted campaign ${campaignId} (rollback)`);
    } catch (error) {
      // Log but don't throw — cleanup failures shouldn't mask the real error
      this.logger.warn(
        `Failed to delete campaign ${campaignId} during rollback`,
        error,
      );
    }
  }

  /**
   * Get campaign details from Revive
   */
  async getCampaign(
    sessionId: string,
    campaignId: number,
    client?: xmlrpc.Client,
  ): Promise<ReviveCampaign> {
    const reviveClient = client || this.session?.client;
    if (!reviveClient) {
      throw new InternalServerErrorException('No active Revive session');
    }

    try {
      const campaign = await this.callReviveMethod<any>(
        reviveClient,
        'ox.getCampaign',
        [sessionId, campaignId],
      );

      return {
        campaignId: campaign.campaignId,
        advertiserId: campaign.advertiserId,
        campaignName: campaign.campaignName,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        budgetAmount: campaign.budgetAmount,
        budgetType: campaign.budgetType,
        pacing: campaign.pacing,
        status: campaign.status === 1 ? 'active' : 'inactive',
      };
    } catch (error) {
      this.logger.error(`Failed to get campaign ${campaignId}`, error);
      throw error;
    }
  }

  /**
   * Get all zones (placements) available in Revive
   * This is useful for validating placements before campaign creation
   */
  async getZones(
    sessionId: string,
    client?: xmlrpc.Client,
  ): Promise<ReviveZone[]> {
    const reviveClient = client || this.session?.client;
    if (!reviveClient) {
      throw new InternalServerErrorException('No active Revive session');
    }

    try {
      const zones = await this.callReviveMethod<any[]>(
        reviveClient,
        'ox.getZoneList',
        [sessionId],
      );

      return (zones || []).map((zone) => ({
        zoneId: Number(zone.zoneId),
        zoneName: zone.zoneName,
        zoneType: zone.zoneType,
        width: Number(zone.width),
        height: Number(zone.height),
      }));
    } catch (error) {
      this.logger.error('Failed to get zones from Revive', error);
      throw error;
    }
  }

  /**
   * Validate that Revive connection is working
   */
  async healthCheck(): Promise<boolean> {
    try {
      const session = await this.authenticate();
      await this.logoff();
      return true;
    } catch (error) {
      this.logger.error('Revive health check failed', error);
      return false;
    }
  }

  /**
   * Complete campaign push to Revive with transactional semantics
   * 
   * Steps:
   * 1. Create/find advertiser
   * 2. Create campaign
   * 3. Create banners
   * 4. Link campaign to zones
   * 
   * If any step fails after campaign creation, the campaign is rolled back
   */
  async pushCampaignToRevive(
    accountId: string,
    accountName: string,
    campaignPayload: CampaignPayload & {
      banners: BannerPayload[];
      zoneIds: number[];
    },
  ): Promise<PushResult> {
    return this.withSession(async (session) => {
      const { client, sessionId } = session;

      try {
        // Step 1: Find or create advertiser
        const advertiser = await this.findOrCreateAdvertiser(
          sessionId,
          accountId,
          accountName,
          client,
        );

        // Step 2: Create campaign
        const reviveCampaignId = await this.createCampaign(
          sessionId,
          {
            ...campaignPayload,
            advertiserId: advertiser.advertiserId,
          },
          client,
        );

        try {
          // Step 3: Create banners
          const reviveBannerIds: number[] = [];
          for (const bannerPayload of campaignPayload.banners) {
            const bannerId = await this.createBanner(
              sessionId,
              {
                ...bannerPayload,
                campaignId: reviveCampaignId,
              },
              client,
            );
            reviveBannerIds.push(bannerId);
          }

          // Step 4: Link campaign to zones
          if (campaignPayload.zoneIds.length > 0) {
            await this.linkCampaignToZones(
              sessionId,
              reviveCampaignId,
              campaignPayload.zoneIds,
              client,
            );
          }

          this.logger.log(
            `Successfully pushed campaign ${reviveCampaignId} with ${reviveBannerIds.length} banners`,
          );

          return {
            reviveCampaignId,
            reviveBannerIds,
            reviveAdvertiserId: advertiser.advertiserId,
          };
        } catch (error) {
          // Compensating action: rollback campaign if banner creation or zone linking fails
          this.logger.error(
            `Campaign push failed after campaign creation. Rolling back campaign ${reviveCampaignId}`,
          );
          await this.deleteCampaign(sessionId, reviveCampaignId, client);
          throw error;
        }
      } catch (error) {
        this.logger.error('Campaign push to Revive failed', error);
        throw error;
      }
    });
  }
}
