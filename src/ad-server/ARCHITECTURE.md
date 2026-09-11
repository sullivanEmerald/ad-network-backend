# Revive AdServer Integration Architecture

## Overview

The Revive AdServer integration is a production-grade, senior-level implementation that bridges the campaign wizard application with Revive AdServer for live ad campaign publishing.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                         │
│  Campaign Wizard Builder → Draft Storage → Publish Button           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ HTTP POST /api/campaigns/:id/publish
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│                      Backend (NestJS)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CampaignsController → CampaignsService                       │   │
│  │ ├─ Load draft campaign from MongoDB                         │   │
│  │ ├─ Validate campaign completeness                           │   │
│  │ └─ Transform to Revive format                               │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │                                             │
│  ┌─────────────────────▼───────────────────────────────────────┐   │
│  │ AdServerModule → ReviveApiService                            │   │
│  │ ├─ Authenticate with Revive (XML-RPC session)               │   │
│  │ ├─ Create/Find advertiser (idempotent)                       │   │
│  │ ├─ Create campaign                                           │   │
│  │ ├─ Create banners (creatives)                                │   │
│  │ ├─ Link campaign to zones (targeting)                        │   │
│  │ ├─ Automatic rollback on failure                             │   │
│  │ └─ Logoff session & cleanup                                  │   │
│  └─────────────────────┬───────────────────────────────────────┘   │
│                        │ ConfigService                              │
│                        │ (Environment variables)                    │
└────────────────────────┼──────────────────────────────────────────┘
                         │ XML-RPC over HTTPS
                         │
┌────────────────────────▼──────────────────────────────────────────┐
│                     Revive AdServer                                │
│  ├─ Advertisers                                                   │
│  ├─ Campaigns                                                     │
│  ├─ Banners (Creatives)                                           │
│  └─ Zones (Placements)                                            │
└────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. ReviveApiService (`revive-api.service.ts`)

The heart of the integration. Provides:

- **Session Management**: `authenticate()`, `logoff()`, `withSession()`
- **Entity Operations**: `findOrCreateAdvertiser()`, `createCampaign()`, `createBanner()`, `linkCampaignToZones()`
- **Query Operations**: `getCampaign()`, `getZones()`, `healthCheck()`
- **Transactional Operations**: `pushCampaignToRevive()` with automatic rollback
- **Error Handling**: Transforms Revive errors to NestJS exceptions
- **Resilience**: Automatic retry with exponential backoff

Key design patterns:

```typescript
// Pattern 1: Session-based operations with guaranteed cleanup
const result = await service.withSession(async (session) => {
  // All work here
  // Session is automatically logged off, even on error
});

// Pattern 2: Transactional campaign creation with rollback
const result = await service.pushCampaignToRevive(accountId, accountName, payload);
// If creation/linking fails after campaign is created, campaign is deleted

// Pattern 3: Idempotent advertiser lookup
const advertiser = await service.findOrCreateAdvertiser(sessionId, accountId, accountName);
// Returns existing if accountId already linked, creates if not
```

### 2. AdServerModule (`ad-server.module.ts`)

NestJS module that:
- Imports `ConfigModule` for environment variables
- Provides `ReviveApiService` as a singleton
- Exports service for use in other modules

### 3. AdServerController (`ad-server.controller.ts`)

REST endpoints for:
- `POST /api/ad-server/campaigns/publish` - Publish complete campaign
- `GET /api/ad-server/health` - Check Revive connection
- `GET /api/ad-server/zones` - List available zones

### 4. DTOs (`dto/publish-campaign-to-revive.dto.ts`)

Class-validator decorated classes for request/response validation:
- `PublishBannerDto` - Individual banner definition
- `PublishCampaignToReviveDto` - Complete campaign payload

### 5. Integration Example (`campaigns.service.revive-integration.example.ts`)

Demonstrates how to extend `CampaignsService` with `publishCampaignToRevive()` method that:
- Validates campaign completeness
- Transforms local format to Revive format
- Calls `ReviveApiService.pushCampaignToRevive()`
- Stores Revive IDs in local database for tracking

## Data Flow

### Campaign Publishing Sequence

```
1. Frontend sends publish request
   POST /api/campaigns/campaign-123/publish
   Body: { accountId: "acme-corp", accountName: "Acme Corporation" }

2. CampaignsController receives request
   ├─ Validates payload using DTO
   └─ Calls CampaignsService.publishCampaignToRevive()

3. CampaignsService orchestrates the flow
   ├─ Loads campaign draft from MongoDB
   ├─ Validates all required fields present
   ├─ Transforms local format to Revive format
   └─ Calls ReviveApiService.pushCampaignToRevive()

4. ReviveApiService.pushCampaignToRevive() executes transaction
   
   Session Creation:
   ├─ Call ox.logon() → sessionId
   
   Advertiser:
   ├─ Call ox.getAdvertiserListByAgencyId()
   ├─ Check for existing (using accountId as idempotency key)
   ├─ If not found: ox.addAdvertiser() → advertiserId
   
   Campaign:
   ├─ Call ox.addCampaign() → campaignId
   
   Banners (in transaction):
   ├─ For each asset:
   │  └─ Call ox.addBanner() → bannerId
   
   Zone Linking (in transaction):
   ├─ For each zone:
   │  └─ Call ox.linkCampaignToZone()
   
   Cleanup:
   ├─ Call ox.logoff()
   
   Rollback (on any failure after campaign creation):
   ├─ Call ox.deleteCampaign()
   └─ Re-throw error

5. CampaignsService updates local database
   ├─ Store reviveCampaignId, reviveBannerIds, reviveAdvertiserId
   ├─ Set campaign.status = 'active'
   └─ Save to MongoDB

6. Response returned to frontend
   {
     success: true,
     campaignId: "local-campaign-id",
     reviveCampaignId: 12345,
     reviveBannerIds: [67890, 67891],
     message: "Campaign successfully published"
   }
```

## Configuration

Environment variables control all Revive connection settings:

```bash
# Connection
REVIVE_HOST=revive.example.com
REVIVE_USERNAME=api_user
REVIVE_PASSWORD=secure_password

# Routing
REVIVE_API_PATH=/www/api/v2/xmlrpc/
REVIVE_USE_SSL=true
REVIVE_PORT=443

# Resilience
REVIVE_REQUEST_TIMEOUT=30000      # ms
REVIVE_MAX_RETRIES=3
```

These are loaded by `ConfigService` and injected into `ReviveApiService`.

## Error Handling Strategy

### Error Classification

| Error Type | Example | Action | HTTP Status |
|-----------|---------|--------|-------------|
| **Authentication** | Invalid credentials | Retry 0 times | 401 |
| **Transient Network** | Connection refused | Retry up to 3x | 503 |
| **Bad Request** | Invalid parameters | Retry 0 times | 400 |
| **Server Unavailable** | Timeout | Retry up to 3x | 503 |
| **Unexpected** | Unknown error | Retry 0 times | 500 |

### Retry Logic

```
Attempt 1: Immediate
Attempt 2: 100ms + jitter
Attempt 3: 200ms + jitter
Attempt 4: 400ms + jitter
```

Max jitter: ±10% of base delay
Max total delay: 5000ms

### Rollback Semantics

If `pushCampaignToRevive()` fails **after** campaign creation:

```typescript
// Advertiser & Campaign created successfully
try {
  // This fails (e.g., invalid banner dimensions)
  const bannerId = await createBanner(...);
} catch (error) {
  // Compensating action: delete the campaign
  await deleteCampaign(campaignId);
  // Re-throw the error
  throw error;
}
```

Result: Client sees error, campaign never goes live partially.

## Type Safety

Full TypeScript support across the stack:

```typescript
// Request validation
@Post()
async publish(@Body() dto: PublishCampaignToReviveDto) { }

// Strongly typed returns
interface PushResult {
  reviveCampaignId: number;
  reviveBannerIds: number[];
  reviveAdvertiserId: number;
}

// Revive entity types
interface ReviveCampaign {
  campaignId: number;
  advertiserId: number;
  campaignName: string;
  startDate: string;
  endDate?: string;
  budgetAmount: number;
  budgetType: 'impression' | 'click' | 'conversion';
  status: 'active' | 'inactive' | 'deleted';
}
```

## Testing Strategy

### Unit Tests

Mock XML-RPC client responses to test:
- ✅ Successful operations
- ❌ Error handling and transformation
- 🔄 Retry logic
- 🔙 Rollback behavior
- 📍 Session management

See `revive-api.service.spec.ts` for comprehensive examples.

### Integration Tests

Test against a real or containerized Revive instance:
```bash
REVIVE_HOST=localhost:8000 npm run test:integration
```

### End-to-End Tests

Test complete flow from frontend through backend to Revive:
```bash
npm run test:e2e
```

## Security Considerations

### 1. Credential Management

Never hardcode credentials:
```typescript
// ❌ DON'T
const password = 'my-password';

// ✅ DO
const password = this.configService.get('REVIVE_PASSWORD');
```

### 2. Session Lifecycle

Sessions are short-lived:
```typescript
// ✅ DO - Session is acquired, used, and released
await service.withSession(async (session) => {
  // One-off operation
});

// ❌ DON'T - Don't cache sessions across requests
this.cachedSession = await service.authenticate();
```

### 3. Input Validation

All inputs validated before sending to Revive:
```typescript
// DTO validation
@IsNumber()
@Min(1)
width!: number;

// Custom validation in service
validateCampaignData(data) {
  if (data.width < 1 || data.width > 2048) {
    throw new BadRequestException('Invalid width');
  }
}
```

### 4. Error Messages

Sensitive info never exposed to client:
```typescript
// ❌ DON'T
throw new Error(`Failed to connect to ${REVIVE_HOST}`);

// ✅ DO
throw new ServiceUnavailableException(
  'Revive AdServer is currently unavailable'
);
```

## Performance Considerations

### 1. Session Reuse Within Transaction

```typescript
// ✅ Efficient - One session for whole operation
await pushCampaignToRevive() {
  const session = await authenticate();
  // Do all work with same session
  // Logoff once at end
}

// ❌ Inefficient - Multiple logon/logoff calls
const advertiser = await findAdvertiser(); // auth + logoff
const campaign = await createCampaign(); // auth + logoff
```

### 2. Parallel Banner Creation

Current implementation creates banners sequentially. For performance, could parallelize:
```typescript
// Future optimization: Create banners in parallel within same session
const bannerPromises = payload.banners.map(banner =>
  this.createBanner(sessionId, banner, client)
);
const bannerIds = await Promise.all(bannerPromises);
```

### 3. Connection Pooling

XML-RPC client is created fresh per session (stateless). For high volume, could implement pooling.

## Monitoring & Observability

### Logging

Service logs all operations with appropriate levels:

```typescript
// SUCCESS
logger.log('Successfully authenticated');
logger.log(`Created campaign: ${campaignId}`);

// WARNING
logger.warn('Failed to logoff');
logger.warn(`Deleted campaign ${id} (rollback)`);

// ERROR
logger.error('Failed to authenticate');
logger.error('Campaign push failed');
```

### Metrics to Track

- Session auth success/failure rate
- Campaign creation success rate
- Rollback frequency
- Retry count distribution
- Request latency (by operation)
- Error frequency (by type)

## Future Enhancements

1. **Caching**: Cache zone list to avoid repeated queries
2. **Bulk Operations**: Batch create multiple campaigns
3. **Campaign Updates**: Modify existing campaigns in Revive
4. **Banner Management**: Replace/delete banners
5. **Performance Metrics**: Track Revive API latency
6. **Audit Trail**: Log all operations for compliance
7. **Webhooks**: Listen for Revive events (campaign status changes)
8. **Rate Limiting**: Implement backoff for rate-limited errors

## Related Files

- [README.md](./README.md) - Complete API reference and usage guide
- [INTEGRATION_EXAMPLE.ts](./campaigns.service.revive-integration.example.ts) - CampaignsService integration
- [TESTS.spec.ts](./revive-api.service.spec.ts) - Comprehensive unit tests

## Support

For issues or questions about this integration:

1. Check the [README](./README.md) for common issues
2. Review the [integration example](./campaigns.service.revive-integration.example.ts)
3. Look at [unit tests](./revive-api.service.spec.ts) for usage patterns
4. Verify environment configuration in `.env`
