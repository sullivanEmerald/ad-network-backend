import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as xmlrpc from 'xmlrpc';
import { CreateAdvertiserDto } from './dto/create-advertiser.dto';
import { AdvertisersRepository } from "./advertisers.repositpory";
import { Types } from 'mongoose';
import { REVIVE_ADVERTISER_METHODS } from './revive/advertiser-methods.revive';

@Injectable()
export class AdvertisersService implements OnModuleInit {
    private readonly logger = new Logger(AdvertisersService.name);
    private client!: xmlrpc.Client;
    private sessionId: string | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly advertisersRepository: AdvertisersRepository
    ) { }

    onModuleInit() {
        this.client = xmlrpc.createClient({
            host: this.configService.get<string>('REVIVE_HOST', 'localhost'),
            port: this.configService.get<number>('REVIVE_PORT', 80),
            path: this.configService.get<string>('REVIVE_XMLRPC_PATH', '/revive/api/v2/xmlrpc/index.php'),
        });
    }


    /**
     * Helper method to convert XML-RPC callback functions into Promises
     */
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

    /**
     * Authenticates with Revive Adserver and stores the active session ID
     */
    async login(): Promise<string> {
        const username = this.configService.get<string>('REVIVE_USERNAME', 'admin');
        const password = this.configService.get<string>('REVIVE_PASSWORD');

        try {
            this.sessionId = await this.callApi<string>('ox.logon', [
                username,
                password,
            ]);
            this.logger.log(
                `Successfully authenticated with Revive. Session ID: ${this.sessionId}`,
            );
            return this.sessionId;
        } catch (error) {
            this.logger.error('Failed to log into Revive XML-RPC API', error);
            throw error;
        }
    }

    /**
     * Ensures an active session before making API calls
     */
    private async ensureSession(): Promise<string | null> {
        if (!this.sessionId) {
            await this.login();
        }
        return this.sessionId;
    }

    /**
     * Creates a new Advertiser in Revive
     */
    async createAdvertiser(dto: CreateAdvertiserDto, userId: string) {
        const organizationObjectId = new Types.ObjectId(userId);
        const existingAdvertiser = await this.advertisersRepository.findByOrganizationId(organizationObjectId);
        if (existingAdvertiser) {
            throw new ConflictException('Advertiser already exists for this organization');
        }

        const session = await this.ensureSession();

        // Revive XML-RPC expects: sessionId, struct of fields
        try {
            const advertiserId = await this.callApi<number>(REVIVE_ADVERTISER_METHODS.ADD, [
                session,
                {
                    advertiserName: dto.name,
                    contactName: dto.name,
                    emailAddress: dto.email,
                },
            ]);
            console.log('advertiser id', advertiserId)

            return await this.advertisersRepository.create({
                organizationId: organizationObjectId,
                name: dto.name,
                email: dto.email,
                reviveAdvertiserId: advertiserId
            });

        } catch (error) {
            console.log(error)
        }

    }

    async getAdvertiser(advertiserId: number): Promise<any> {
        const session = await this.ensureSession();

        return this.callApi<any>(REVIVE_ADVERTISER_METHODS.GETADVERTISER, [
            session,
            advertiserId,
        ]);
    }

    async getAdvertiserByOrganizationId(organizationId: string) {
        const organizationObjectId = new Types.ObjectId(organizationId);
        const advertiser = await this.advertisersRepository.findByOrganizationId(organizationObjectId);
        const transformedAdvertiser = advertiser ? {
            id: advertiser._id.toString(),
            name: advertiser.name,
            email: advertiser.email,
        } : null;
        return transformedAdvertiser;
    }
}
