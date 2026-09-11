/**
 * Unit Tests for ReviveApiService
 * 
 * Comprehensive test suite covering authentication, entity operations,
 * error handling, retry logic, and transactional semantics.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ReviveApiService } from './revive-api.service';
import * as xmlrpc from 'xmlrpc';

// Mock xmlrpc module
jest.mock('xmlrpc');

describe('ReviveApiService', () => {
    let service: ReviveApiService;
    let configService: ConfigService;
    let mockClient: any;

    beforeEach(async () => {
        // Setup mock ConfigService
        const configModule = await Test.createTestingModule({
            providers: [
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const config: Record<string, any> = {
                                REVIVE_HOST: 'revive.example.com',
                                REVIVE_USERNAME: 'testuser',
                                REVIVE_PASSWORD: 'testpass',
                                REVIVE_USE_SSL: true,
                                REVIVE_PORT: 443,
                                REVIVE_API_PATH: '/www/api/v2/xmlrpc/',
                                REVIVE_REQUEST_TIMEOUT: 30000,
                                REVIVE_MAX_RETRIES: 3,
                            };
                            return config[key] ?? defaultValue;
                        }),
                    },
                },
                ReviveApiService,
            ],
        }).compile();

        service = configModule.get(ReviveApiService);
        configService = configModule.get(ConfigService);

        // Setup mock XML-RPC client
        mockClient = {
            methodCall: jest.fn(),
        };

        // Mock createSecureClient
        (xmlrpc.createSecureClient as jest.Mock).mockReturnValue(mockClient);
    });

    describe('Authentication', () => {
        it('should successfully authenticate with Revive', async () => {
            const mockSessionId = 'session-12345';

            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                expect(method).toBe('ox.logon');
                expect(params).toEqual(['testuser', 'testpass']);
                callback(null, mockSessionId);
            });

            const result = await service.authenticate();

            expect(result.sessionId).toBe(mockSessionId);
            expect(result.client).toBe(mockClient);
            expect(result.createdAt).toBeInstanceOf(Date);
        });

        it('should throw UnauthorizedException on invalid credentials', async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(new Error('Invalid login'));
            });

            await expect(service.authenticate()).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should properly logoff session', async () => {
            // First authenticate
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(null, 'session-123');
            });

            const session = await service.authenticate();

            // Then logoff
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                expect(method).toBe('ox.logoff');
                expect(params).toEqual(['session-123']);
                callback(null, true);
            });

            await service.logoff();
            expect(service['session']).toBeNull();
        });
    });

    describe('Entity Operations', () => {
        beforeEach(async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(null, 'session-123');
            });
            await service.authenticate();
        });

        describe('findOrCreateAdvertiser', () => {
            it('should find existing advertiser', async () => {
                const mockAdvertisers = [
                    {
                        advertiserId: '42',
                        advertiserName: 'Test Company',
                        reference: 'account-123',
                        comments: 'account-123',
                        agencyId: '0',
                    },
                ];

                mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                    expect(method).toBe('ox.getAdvertiserListByAgencyId');
                    callback(null, mockAdvertisers);
                });

                const result = await service.findOrCreateAdvertiser(
                    'session-123',
                    'account-123',
                    'Test Company',
                );

                expect(result.advertiserId).toBe(42);
                expect(result.advertiserName).toBe('Test Company');
            });

            it('should create new advertiser if not found', async () => {
                mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                    expect(method).toBe('ox.getAdvertiserListByAgencyId');
                    callback(null, []); // No existing advertisers
                });

                mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                    expect(method).toBe('ox.addAdvertiser');
                    const payload = params[1];
                    expect(payload.advertiserName).toBe('New Company');
                    expect(payload.reference).toBe('account-456');
                    callback(null, 99);
                });

                const result = await service.findOrCreateAdvertiser(
                    'session-123',
                    'account-456',
                    'New Company',
                );

                expect(result.advertiserId).toBe(99);
            });
        });

        describe('createCampaign', () => {
            it('should create campaign with valid payload', async () => {
                mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                    expect(method).toBe('ox.addCampaign');
                    const payload = params[1];
                    expect(payload.campaignName).toBe('Test Campaign');
                    expect(payload.advertiserId).toBe(42);
                    callback(null, 123);
                });

                const result = await service.createCampaign('session-123', {
                    advertiserId: 42,
                    campaignName: 'Test Campaign',
                    startDate: '2024-01-01',
                    budgetAmount: 5000,
                    budgetType: 'impression',
                });

                expect(result).toBe(123);
            });
        });

        describe('createBanner', () => {
            it('should create banner with valid payload', async () => {
                mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                    expect(method).toBe('ox.addBanner');
                    const payload = params[1];
                    expect(payload.width).toBe(728);
                    expect(payload.height).toBe(90);
                    callback(null, 456);
                });

                const result = await service.createBanner('session-123', {
                    campaignId: 123,
                    width: 728,
                    height: 90,
                    fileUrl: 'https://example.com/banner.jpg',
                    clickThroughUrl: 'https://example.com',
                    bannerType: 'image',
                });

                expect(result).toBe(456);
            });
        });

        describe('linkCampaignToZones', () => {
            it('should link campaign to multiple zones', async () => {
                const zoneIds = [1, 2, 3];
                let linkCount = 0;

                mockClient.methodCall.mockImplementation((method, params, callback) => {
                    if (method === 'ox.linkCampaignToZone') {
                        linkCount++;
                        expect(params[1]).toBe(123); // campaignId
                        expect([1, 2, 3]).toContain(params[2]); // zoneId
                        callback(null, true);
                    }
                });

                await service.linkCampaignToZones('session-123', 123, zoneIds);
                expect(linkCount).toBe(3);
            });

            it('should throw error if no zones provided', async () => {
                await expect(
                    service.linkCampaignToZones('session-123', 123, []),
                ).rejects.toThrow(BadRequestException);
            });
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(null, 'session-123');
            });
            await service.authenticate();
        });

        it('should transform UnauthorizedException', async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(new Error('Invalid login credentials'));
            });

            await expect(service.createCampaign('session-123', {} as any)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should transform ServiceUnavailableException', async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(new Error('Connection refused'));
            });

            await expect(service.createCampaign('session-123', {} as any)).rejects.toThrow(
                /currently unavailable/,
            );
        });

        it('should transform BadRequestException', async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(new Error('Bad parameter: invalid width'));
            });

            await expect(service.createCampaign('session-123', {} as any)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('Retry Logic', () => {
        it('should retry on transient errors', async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(null, 'session-123');
            });

            await service.authenticate();

            let attempt = 0;
            mockClient.methodCall.mockImplementation((method, params, callback) => {
                attempt++;
                if (attempt < 3) {
                    callback(new Error('ECONNREFUSED'));
                } else {
                    callback(null, 123);
                }
            });

            const result = await service.createCampaign('session-123', {
                advertiserId: 42,
                campaignName: 'Test',
                startDate: '2024-01-01',
                budgetAmount: 1000,
                budgetType: 'impression',
            });

            expect(result).toBe(123);
            expect(attempt).toBe(3);
        });

        it('should not retry on permanent errors', async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(null, 'session-123');
            });

            await service.authenticate();

            let attempt = 0;
            mockClient.methodCall.mockImplementation((method, params, callback) => {
                attempt++;
                callback(new Error('Invalid login'));
            });

            await expect(
                service.createCampaign('session-123', {
                    advertiserId: 42,
                    campaignName: 'Test',
                    startDate: '2024-01-01',
                    budgetAmount: 1000,
                    budgetType: 'impression',
                }),
            ).rejects.toThrow();

            expect(attempt).toBe(1); // Only tried once
        });
    });

    describe('Transactional Operations', () => {
        it('should rollback campaign on banner creation failure', async () => {
            let logoffCalled = false;

            mockClient.methodCall.mockImplementation((method, params, callback) => {
                if (method === 'ox.logon') {
                    callback(null, 'session-123');
                } else if (method === 'ox.getAdvertiserListByAgencyId') {
                    callback(null, []);
                } else if (method === 'ox.addAdvertiser') {
                    callback(null, 42);
                } else if (method === 'ox.addCampaign') {
                    callback(null, 123);
                } else if (method === 'ox.addBanner') {
                    callback(new Error('Invalid banner dimensions'));
                } else if (method === 'ox.deleteCampaign') {
                    callback(null, true);
                } else if (method === 'ox.logoff') {
                    logoffCalled = true;
                    callback(null, true);
                }
            });

            await expect(
                service.pushCampaignToRevive('account-123', 'Test Co', {
                    campaignName: 'Test',
                    startDate: '2024-01-01',
                    budgetAmount: 1000,
                    budgetType: 'impression',
                    banners: [
                        {
                            width: 728,
                            height: 90,
                            fileUrl: 'https://example.com/banner.jpg',
                            clickThroughUrl: 'https://example.com',
                            bannerType: 'image',
                        },
                    ],
                    zoneIds: [1],
                }),
            ).rejects.toThrow();

            expect(logoffCalled).toBe(true);
        });

        it('should return complete result on success', async () => {
            mockClient.methodCall.mockImplementation((method, params, callback) => {
                if (method === 'ox.logon') {
                    callback(null, 'session-123');
                } else if (method === 'ox.getAdvertiserListByAgencyId') {
                    callback(null, []);
                } else if (method === 'ox.addAdvertiser') {
                    callback(null, 42);
                } else if (method === 'ox.addCampaign') {
                    callback(null, 123);
                } else if (method === 'ox.addBanner') {
                    callback(null, 456);
                } else if (method === 'ox.linkCampaignToZone') {
                    callback(null, true);
                } else if (method === 'ox.logoff') {
                    callback(null, true);
                }
            });

            const result = await service.pushCampaignToRevive('account-123', 'Test Co', {
                campaignName: 'Test',
                startDate: '2024-01-01',
                budgetAmount: 1000,
                budgetType: 'impression',
                banners: [
                    {
                        width: 728,
                        height: 90,
                        fileUrl: 'https://example.com/banner.jpg',
                        clickThroughUrl: 'https://example.com',
                        bannerType: 'image',
                    },
                ],
                zoneIds: [1, 2],
            });

            expect(result.reviveCampaignId).toBe(123);
            expect(result.reviveBannerIds).toContain(456);
            expect(result.reviveAdvertiserId).toBe(42);
        });
    });

    describe('Health Check', () => {
        it('should return true when connection succeeds', async () => {
            mockClient.methodCall.mockImplementation((method, params, callback) => {
                if (method === 'ox.logon') {
                    callback(null, 'session-123');
                } else if (method === 'ox.logoff') {
                    callback(null, true);
                }
            });

            const result = await service.healthCheck();
            expect(result).toBe(true);
        });

        it('should return false when connection fails', async () => {
            mockClient.methodCall.mockImplementationOnce((method, params, callback) => {
                callback(new Error('Connection refused'));
            });

            const result = await service.healthCheck();
            expect(result).toBe(false);
        });
    });
});
