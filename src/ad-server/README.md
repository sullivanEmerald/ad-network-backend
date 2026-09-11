# Revive AdServer Integration

Complete production-grade XML-RPC integration with Revive AdServer for campaign and ad creative management.

## Overview

The `ReviveApiService` provides a comprehensive client for interacting with Revive AdServer's XML-RPC API. It handles:

- **Session Management**: Automatic authentication/logout with guaranteed cleanup
- **Entity Operations**: Create advertisers, campaigns, banners, and zone linkages
- **Error Handling**: Transactional semantics with automatic rollback on failures
- **Resilience**: Automatic retry logic with exponential backoff for transient errors
- **Type Safety**: Full TypeScript support with structured request/response types

## Architecture

### Session-Based Authentication

Unlike REST APIs with bearer tokens, Revive uses session-based authentication:

1. Call `ox.logon()` to get a sessionId
2. Pass sessionId to every subsequent API call
3. Call `ox.logoff()` when done
4. Sessions are short-lived and should be released immediately

The service ensures cleanup even if operations fail:

```typescript
await service.withSession(async (session) => {
  // All work happens here
  // Session is guaranteed to logoff, even if this throws
});
```

### Campaign Creation Flow

Creating a complete campaign follows Revive's entity dependency graph:

```
Advertiser
    └─ Campaign
        ├─ Banner 1
        ├─ Banner 2
        └─ Zone Links (Targeting)
```

Steps must execute in order. If banner creation fails, the campaign is rolled back to avoid orphaned campaigns.

## Configuration

Set the following environment variables:

```bash
# Required
REVIVE_HOST=revive.example.com
REVIVE_USERNAME=admin
REVIVE_PASSWORD=secure_password

# Optional (defaults shown)
REVIVE_USE_SSL=true
REVIVE_PORT=443
REVIVE_API_PATH=/www/api/v2/xmlrpc/
REVIVE_REQUEST_TIMEOUT=30000
REVIVE_MAX_RETRIES=3
```

### Example .env Configuration

```env
# Revive AdServer Connection
REVIVE_HOST=your-revive-instance.com
REVIVE_USERNAME=api_user
REVIVE_PASSWORD=your_secure_password
REVIVE_USE_SSL=true
REVIVE_PORT=443
REVIVE_API_PATH=/www/api/v2/xmlrpc/
REVIVE_REQUEST_TIMEOUT=30000        # milliseconds
REVIVE_MAX_RETRIES=3
```

## Usage Examples

### Module Registration

In your main AppModule:

```typescript
import { AdServerModule } from './ad-server/ad-server.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AdServerModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Health Check

```typescript
const isHealthy = await reviveApiService.healthCheck();
console.log(isHealthy ? 'Connected' : 'Connection failed');
```

### List Available Zones

```typescript
const session = await reviveApiService.authenticate();
try {
  const zones = await reviveApiService.getZones(session.sessionId);
  zones.forEach(zone => console.log(`${zone.zoneName}: ${zone.width}x${zone.height}`));
} finally {
  await reviveApiService.logoff();
}
```

### Create a Complete Campaign

```typescript
const result = await reviveApiService.pushCampaignToRevive(
  'account-123',
  'My Company',
  {
    campaignName: 'Summer Campaign 2024',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    budgetAmount: 5000,
    budgetType: 'impression',
    pacing: 'even',
    banners: [
      {
        width: 728,
        height: 90,
        fileUrl: 'https://cdn.example.com/banner-728x90.jpg',
        clickThroughUrl: 'https://example.com/campaign',
        bannerName: 'Leaderboard Banner',
        bannerType: 'image',
      },
      {
        width: 300,
        height: 250,
        fileUrl: 'https://cdn.example.com/banner-300x250.jpg',
        clickThroughUrl: 'https://example.com/campaign',
        bannerName: 'Medium Rectangle',
        bannerType: 'image',
      },
    ],
    zoneIds: [1, 2, 3], // Zone IDs from getZones()
  },
);

console.log(`Campaign created: ${result.reviveCampaignId}`);
console.log(`Banners: ${result.reviveBannerIds.join(', ')}`);
```

## Error Handling

The service transforms Revive API errors into appropriate HTTP exceptions:

```typescript
try {
  await reviveApiService.pushCampaignToRevive(...);
} catch (error) {
  if (error instanceof UnauthorizedException) {
    // Invalid credentials
  } else if (error instanceof ServiceUnavailableException) {
    // Revive is down
  } else if (error instanceof BadRequestException) {
    // Invalid parameters
  } else if (error instanceof InternalServerErrorException) {
    // Unexpected error
  }
}
```

## Retry Strategy

The service automatically retries transient errors (network issues) with exponential backoff:

- **Retryable errors**: Connection refused, timeout, host unreachable, network unreachable
- **Non-retryable errors**: Authentication failure, bad parameters, invalid API calls
- **Backoff**: `100ms * 2^attempt` with ±10% jitter, capped at 5000ms
- **Max retries**: 3 (configurable)

## API Reference

### Authentication Methods

#### `authenticate(): Promise<ReviveSession>`

Create a new authenticated session. Returns `{ client, sessionId, createdAt }`.

```typescript
const session = await service.authenticate();
```

#### `logoff(): Promise<void>`

Close the current session and release resources.

```typescript
await service.logoff();
```

### Entity Methods

#### `findOrCreateAdvertiser(sessionId, accountId, accountName): Promise<ReviveAdvertiser>`

Find or create an advertiser. Uses `accountId` as idempotency key.

```typescript
const advertiser = await service.findOrCreateAdvertiser(
  sessionId,
  'account-123',
  'My Company',
);
```

#### `createCampaign(sessionId, payload): Promise<number>`

Create a new campaign. Returns campaign ID.

```typescript
const campaignId = await service.createCampaign(sessionId, {
  advertiserId: 42,
  campaignName: 'Q3 Campaign',
  startDate: '2024-07-01',
  endDate: '2024-09-30',
  budgetAmount: 10000,
  budgetType: 'impression',
  pacing: 'even',
});
```

#### `createBanner(sessionId, payload): Promise<number>`

Create a banner (ad creative) in a campaign. Returns banner ID.

```typescript
const bannerId = await service.createBanner(sessionId, {
  campaignId: 123,
  width: 728,
  height: 90,
  fileUrl: 'https://example.com/banner.jpg',
  clickThroughUrl: 'https://example.com',
  bannerType: 'image',
});
```

#### `linkCampaignToZones(sessionId, campaignId, zoneIds): Promise<void>`

Link a campaign to zones (placements) for targeting.

```typescript
await service.linkCampaignToZones(sessionId, campaignId, [1, 2, 3]);
```

#### `deleteCampaign(sessionId, campaignId): Promise<void>`

Delete a campaign (used for rollback).

```typescript
await service.deleteCampaign(sessionId, campaignId);
```

### Query Methods

#### `getCampaign(sessionId, campaignId): Promise<ReviveCampaign>`

Retrieve campaign details.

```typescript
const campaign = await service.getCampaign(sessionId, 123);
```

#### `getZones(sessionId): Promise<ReviveZone[]>`

List all available zones.

```typescript
const zones = await service.getZones(sessionId);
zones.forEach(zone => {
  console.log(`${zone.zoneName}: ${zone.width}x${zone.height}`);
});
```

### Transactional Operations

#### `pushCampaignToRevive(accountId, accountName, payload): Promise<PushResult>`

Complete campaign creation with automatic rollback on failure.

```typescript
const result = await service.pushCampaignToRevive(
  'account-123',
  'My Company',
  {
    campaignName: 'Q3 Campaign',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    budgetAmount: 10000,
    budgetType: 'impression',
    banners: [{ width: 728, height: 90, fileUrl: '...' }],
    zoneIds: [1, 2],
  },
);
```

Returns:
```typescript
{
  reviveCampaignId: 123,
  reviveBannerIds: [456, 457],
  reviveAdvertiserId: 42,
}
```

## Best Practices

### 1. Use `pushCampaignToRevive` for Complete Operations

Always use the high-level `pushCampaignToRevive()` method for campaign creation. It handles the entire flow with transactional semantics and automatic rollback.

```typescript
// ✅ DO THIS
const result = await service.pushCampaignToRevive(accountId, accountName, payload);
```

### 2. Handle Errors Appropriately

```typescript
// ✅ DO THIS
try {
  const result = await service.pushCampaignToRevive(...);
  // Log success with IDs for tracking
  logger.log(`Campaign ${result.reviveCampaignId} created`);
} catch (error) {
  // Campaign is already rolled back if it was created
  logger.error('Campaign creation failed', error);
  // Return error to client
  throw error;
}
```

### 3. Validate Zones Before Publishing

```typescript
// ✅ DO THIS
const zones = await service.getZones(sessionId);
const availableZoneIds = zones.map(z => z.zoneId);
const requestedZones = payload.zoneIds;

const invalidZones = requestedZones.filter(z => !availableZoneIds.includes(z));
if (invalidZones.length > 0) {
  throw new BadRequestException(`Invalid zones: ${invalidZones.join(', ')}`);
}
```

### 4. Store Campaign IDs Immediately

Save the returned campaign/banner IDs to your database for tracking and future operations.

```typescript
const result = await service.pushCampaignToRevive(...);

await campaignModel.updateOne(
  { _id: localCampaignId },
  {
    reviveCampaignId: result.reviveCampaignId,
    reviveBannerIds: result.reviveBannerIds,
    reviveAdvertiserId: result.reviveAdvertiserId,
    status: 'published',
    publishedAt: new Date(),
  },
);
```

### 5. Use Meaningful Advertiser References

The `reference` and `comments` fields are used for idempotency. Use your internal account ID:

```typescript
// References field acts as idempotency key
const advertiser = await service.findOrCreateAdvertiser(
  sessionId,
  'acme-corp-account-id', // Use your internal ID
  'Acme Corp',
);
```

## Testing

### Mock Configuration

For testing without a live Revive instance:

```typescript
describe('ReviveApiService', () => {
  it('should handle missing configuration', () => {
    // Clear environment variables
    delete process.env.REVIVE_HOST;

    expect(() => {
      new ReviveApiService(configService);
    }).toThrow();
  });
});
```

### Integration Tests

```typescript
it('should create a complete campaign', async () => {
  const result = await service.pushCampaignToRevive(
    'test-account',
    'Test Company',
    {
      campaignName: 'Test Campaign',
      startDate: '2024-01-01',
      budgetAmount: 1000,
      budgetType: 'impression',
      banners: [{ width: 728, height: 90, fileUrl: '...' }],
      zoneIds: [1],
    },
  );

  expect(result.reviveCampaignId).toBeDefined();
  expect(result.reviveBannerIds.length).toBe(1);
});
```

## Troubleshooting

### "Missing Revive config" Error

Ensure all required environment variables are set:

```bash
export REVIVE_HOST=your-host
export REVIVE_USERNAME=your-user
export REVIVE_PASSWORD=your-password
npm run start:dev
```

### "Invalid login" Error

- Verify credentials are correct
- Check if user has API access enabled in Revive admin panel
- Ensure user has permission to create campaigns/advertisers

### Connection Timeout

- Verify Revive server is running and accessible
- Check network connectivity to Revive host
- Increase `REVIVE_REQUEST_TIMEOUT` if server is slow
- Verify SSL certificate if using HTTPS

### "Bad parameter" Errors

- Banner widths/heights must match available zone dimensions
- Dates must be in "YYYY-MM-DD" format
- Campaign names must be unique per advertiser
- Budget amounts must be positive numbers

## Monitoring & Logging

The service logs all operations with appropriate levels:

```typescript
// ✅ Monitor these logs
logger.log('Successfully authenticated with Revive AdServer');
logger.log(`Created campaign: ${campaignId}`);
logger.log(`Linked campaign ${campaignId} to ${zoneIds.length} zones`);

// ⚠️ Watch these warnings
logger.warn(`Deleted campaign ${campaignId} (rollback)`);
logger.warn(`Failed to logoff from Revive AdServer`);

// 🔴 Alert on these errors
logger.error('Failed to authenticate with Revive AdServer');
logger.error('Campaign push to Revive failed');
```

## References

- [Revive AdServer Documentation](https://docs.reviveadserver.com/)
- [Revive XML-RPC API Reference](https://docs.reviveadserver.com/display/revive/XML-RPC+API)
- [NestJS ConfigModule](https://docs.nestjs.com/techniques/configuration)
