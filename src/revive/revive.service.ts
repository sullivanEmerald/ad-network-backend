import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as xmlrpc from 'xmlrpc';
import { REVIVE_ADVERTISER_METHODS } from '../advertisers/revive/advertiser-methods.revive';
import { REVIVE_CAMPAIGN_METHODS } from './enums/campaigns.enums';
import { REVIVE_CREATIVE_METHODS } from '../creative/methods/creative-methods.revive';
import { REVIVE_PUBLISHER_METHODS } from '../publishers/revive/publishers-method.revive';
import { REVIVE_AGENCY_METHODS } from './enums/agency.enums';

@Injectable()
export class ReviveService implements OnModuleInit {
    private readonly logger = new Logger(ReviveService.name);
    private client!: xmlrpc.Client;
    private sessionId: string | null = null;

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        this.client = xmlrpc.createClient({
            host: this.configService.get<string>('REVIVE_HOST', 'localhost'),
            port: this.configService.get<number>('REVIVE_PORT', 80),
            path: this.configService.get<string>('REVIVE_XMLRPC_PATH', '/revive/api/v2/xmlrpc/index.php'),
        });
    }

    private callApi<T>(methodName: string, params: any[]): Promise<T> {
        return new Promise((resolve, reject) => {
            this.client.methodCall(methodName, params, (error: any, value: T) => {
                if (error) {
                    this.logger.error(`XML-RPC Error [${methodName}]:`, error);
                    return reject(error);
                }
                resolve(value);
            });
        });
    }

    async login(): Promise<string> {
        const username = this.configService.get<string>('REVIVE_USERNAME', 'admin');
        const password = this.configService.get<string>('REVIVE_PASSWORD');

        try {
            this.sessionId = await this.callApi<string>('ox.logon', [username, password]);
            this.logger.log(`Successfully authenticated with Revive. Session ID: ${this.sessionId}`);
            return this.sessionId;
        } catch (error) {
            this.logger.error('Failed to log into Revive XML-RPC API', error);
            throw error;
        }
    }

    private async ensureSession(): Promise<string | null> {
        if (!this.sessionId) {
            await this.login();
        }
        return this.sessionId;
    }

    async addAdvertiser(name: string, email: string): Promise<number> {
        const session = await this.ensureSession();

        return this.callApi<number>(REVIVE_ADVERTISER_METHODS.ADD, [
            session,
            {
                advertiserName: name,
                contactName: name,
                emailAddress: email,
            },
        ]);
    }

    async getAdvertiser(advertiserId: number): Promise<any> {
        const session = await this.ensureSession();

        return this.callApi<any>(REVIVE_ADVERTISER_METHODS.GETADVERTISER, [
            session,
            advertiserId,
        ]);
    }

    // CAMPAGINS
    async addCampaign(dto: { advertiserId: number | null | undefined, campaignName: string, startDate: Date, endDate?: Date | null }) {
        const sessionId = await this.ensureSession()

        try {
            const campaignId = await this.callApi<any>(REVIVE_CAMPAIGN_METHODS.ADDCAMPAIGN, [
                sessionId,
                {
                    advertiserId: dto.advertiserId,
                    campaignName: dto.campaignName,
                    startDate: dto.startDate,
                    ...(dto.endDate && {
                        endDate: dto.endDate,
                    }),
                }
            ])

            return campaignId;
        } catch (error) {
            console.log(error)
            throw new BadRequestException('Campaign not successfully Created')
        } finally {
            // await this.logout(sessionId);
        }
    }

    // Banners
    async addBanner(dto: {
        campaignId: number;
        bannerName: string;
        imageFilename: string;
        imageContent: Buffer;
        destinationUrl: string;
    }) {
        const sessionId = await this.ensureSession();

        try {
            const bannerId = await this.callApi<number>(
                REVIVE_CREATIVE_METHODS.ADD_BANNER,
                [
                    sessionId,
                    {
                        campaignId: dto.campaignId,
                        bannerName: dto.bannerName,
                        aImage: { filename: dto.imageFilename, content: dto.imageContent, },
                        url: dto.destinationUrl,
                        weight: 1,
                        target: '_blank',
                        status: 0,
                    },
                ],
            );

            return bannerId;
        } catch (error) {
            this.logger.error('Failed to create Revive banner', error);

            throw new BadRequestException(
                'Banner not successfully created',
            );
        }
    }

    // PUBLISHERS
    async addPublisher(dto: {
        agencyId: number | undefined;
        publisherName: string;
        contactName: string;
        emailAddress: string;
        website: string;
        comments?: string;
    }): Promise<number> {
        const sessionId = await this.ensureSession();

        try {
            const publisherId = await this.callApi<number>(
                REVIVE_PUBLISHER_METHODS.ADD,
                [
                    sessionId,
                    {
                        agencyId: dto.agencyId,
                        publisherName: dto.publisherName,
                        contactName: dto.contactName,
                        emailAddress: dto.emailAddress,
                        website: dto.website,
                        ...(dto.comments && {
                            comments: dto.comments,
                        }),
                    },
                ],
            );

            this.logger.log(
                `Successfully created Revive publisher: ${publisherId}`,
            );

            return publisherId;
        } catch (error) {
            this.logger.error(
                'Failed to create publisher in Revive',
                error,
            );

            throw error;
        }
    }

    // Publishers
    async addAgency(dto: {
        agencyName: string;
        contactName: string;
        emailAddress: string;
        username: string;
        password: string;
        userEmail: string;
        language?: string;
        status?: number;
    }): Promise<number> {
        const sessionId = await this.ensureSession();

        try {
            const agencyId = await this.callApi<number>(
                REVIVE_AGENCY_METHODS.ADD,
                [
                    sessionId,
                    {
                        agencyName: dto.agencyName,
                        contactName: dto.contactName,
                        emailAddress: dto.emailAddress,
                        username: dto.username,
                        password: dto.password,
                        userEmail: dto.userEmail,
                        language: dto.language ?? 'en',
                        status: dto.status ?? 1,
                    },
                ],
            );

            this.logger.log(
                `Successfully created Revive agency: ${agencyId}`,
            );

            return agencyId;
        } catch (error) {
            this.logger.error(
                'Failed to create agency in Revive',
                error,
            );

            throw error;
        }
    }



}
