# Quick Reference Guide - Revive AdServer Integration

## Installation & Setup

```bash
# 1. Install dependencies (already in package.json)
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Revive credentials

# 3. Build & start
npm run build
npm run start
```

## Configuration

```env
REVIVE_HOST=your-revive-instance.com
REVIVE_USERNAME=api_user
REVIVE_PASSWORD=your_secure_password
REVIVE_USE_SSL=true
REVIVE_PORT=443
REVIVE_API_PATH=/www/api/v2/xmlrpc/
REVIVE_REQUEST_TIMEOUT=30000
REVIVE_MAX_RETRIES=3
```

## Module Registration

```typescript
// app.module.ts
import { AdServerModule } from './ad-server/ad-server.module';

@Module({
  imports: [AdServerModule, /* ... */],
})
export class AppModule {}
```

## Basic Usage

### 1. Health Check
```typescript
// Check if Revive is accessible
const isHealthy = await reviveApiService.healthCheck();
console.log(isHealthy ? 'Connected' : 'Disconnected');
```

### 2. List Zones (Placements)
```typescript
// Get all available zones/placements
const session = await reviveApiService.authenticate();
try {
  const zones = await reviveApiService.getZones(session.sessionId);
  zones.forEach(zone => {
    console.log(`${zone.zoneName}: ${zone.width}x${zone.height}`);
  });
} finally {
  await reviveApiService.logoff();
}
```

### 3. Complete Campaign Publication
```typescript
// The high-level, transactional approach (recommended)
const result = await reviveApiService.pushCampaignToRevive(
  'account-123',
  'My Company',
  {
    campaignName: 'Summer Campaign',
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
        bannerName: 'Leaderboard',
        bannerType: 'image',
      },
    ],
    zoneIds: [1, 2, 3],
  },
);

console.log(`Campaign: ${result.reviveCampaignId}`);
console.log(`Banners: ${result.reviveBannerIds.join(', ')}`);
console.log(`Advertiser: ${result.reviveAdvertiserId}`);
```

## Low-Level Usage (Advanced)

### 1. Authenticate
```typescript
const session = await service.authenticate();
// session = { client, sessionId, createdAt }
```

### 2. Find or Create Advertiser
```typescript
const advertiser = await service.findOrCreateAdvertiser(
  session.sessionId,
  'account-123',    // idempotency key
  'Company Name',
  session.client
);
// Returns: { advertiserId, advertiserName, agencyId }
```

### 3. Create Campaign
```typescript
const campaignId = await service.createCampaign(
  session.sessionId,
  {
    advertiserId: 42,
    campaignName: 'Q3 Campaign',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
    budgetAmount: 10000,
    budgetType: 'impression',
    pacing: 'even',
  },
  session.client
);
// Returns: campaignId (number)
```

### 4. Create Banner
```typescript
const bannerId = await service.createBanner(
  session.sessionId,
  {
    campaignId: 123,
    width: 728,
    height: 90,
    fileUrl: 'https://example.com/banner.jpg',
    clickThroughUrl: 'https://example.com',
    bannerType: 'image',
    bannerName: 'Leaderboard Banner',
  },
  session.client
);
// Returns: bannerId (number)
```

### 5. Link Campaign to Zones
```typescript
await service.linkCampaignToZones(
  session.sessionId,
  campaignId,
  [1, 2, 3],  // zone IDs
  session.client
);
```

### 6. Logoff
```typescript
await service.logoff();
```

## Integration with CampaignsService

```typescript
// In campaigns.controller.ts
@Post(':id/publish')
async publishCampaign(
  @Param('id') campaignId: string,
  @Body() { accountId, accountName }: { accountId: string; accountName: string }
) {
  // See campaigns.service.revive-integration.example.ts
  return this.campaignsService.publishCampaignToRevive(
    campaignId,
    accountId,
    accountName
  );
}
```

## Error Handling

```typescript
import {
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';

try {
  const result = await reviveApiService.pushCampaignToRevive(...);
} catch (error) {
  if (error instanceof UnauthorizedException) {
    // Invalid Revive credentials
    return res.status(401).json({ error: 'Authentication failed' });
  } else if (error instanceof ServiceUnavailableException) {
    // Revive server is down
    return res.status(503).json({ error: 'Service unavailable' });
  } else if (error instanceof BadRequestException) {
    // Invalid request parameters
    return res.status(400).json({ error: error.message });
  } else {
    // Unknown error
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## REST API Endpoints

### Publish Campaign
```http
POST /api/ad-server/campaigns/publish
Content-Type: application/json

{
  "campaignName": "Summer Campaign",
  "startDate": "2024-06-01",
  "endDate": "2024-08-31",
  "budgetAmount": 5000,
  "budgetType": "impression",
  "clickThroughUrl": "https://example.com",
  "pacing": "even",
  "banners": [
    {
      "width": 728,
      "height": 90,
      "fileUrl": "https://cdn.example.com/banner.jpg",
      "bannerName": "Leaderboard",
      "bannerType": "image"
    }
  ],
  "zoneIds": [1, 2, 3],
  "accountId": "acme-corp",
  "accountName": "Acme Corporation"
}
```

### Health Check
```http
GET /api/ad-server/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### List Zones
```http
GET /api/ad-server/zones
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "zoneId": 1,
      "zoneName": "Homepage - Top",
      "zoneType": "text",
      "width": 728,
      "height": 90
    },
    {
      "zoneId": 2,
      "zoneName": "Sidebar - Square",
      "zoneType": "image",
      "width": 300,
      "height": 300
    }
  ],
  "count": 2
}
```

## Common Tasks

### Check Revive Connection
```typescript
const healthy = await reviveApiService.healthCheck();
```

### Get Available Zones
```typescript
const session = await reviveApiService.authenticate();
try {
  const zones = await reviveApiService.getZones(session.sessionId);
} finally {
  await reviveApiService.logoff();
}
```

### Create Full Campaign Flow
```typescript
const result = await reviveApiService.pushCampaignToRevive(
  accountId,
  accountName,
  {
    campaignName, startDate, endDate, budgetAmount, budgetType,
    banners: [{ width, height, fileUrl, clickThroughUrl, bannerType }],
    zoneIds: [1, 2, 3]
  }
);

// Store result IDs in database
await campaignModel.updateOne(
  { _id: localCampaignId },
  {
    reviveCampaignId: result.reviveCampaignId,
    reviveBannerIds: result.reviveBannerIds,
    status: 'published'
  }
);
```

### Update Campaign in Database After Push
```typescript
const campaign = await campaignModel.findById(campaignId);

try {
  const result = await reviveApiService.pushCampaignToRevive(...);
  
  campaign.data.reviveCampaignId = result.reviveCampaignId;
  campaign.data.reviveBannerIds = result.reviveBannerIds;
  campaign.status = 'active';
  await campaign.save();
  
  return { success: true, reviveCampaignId: result.reviveCampaignId };
} catch (error) {
  campaign.data.publicationError = error.message;
  await campaign.save();
  throw error;
}
```

## Debugging

### Enable Detailed Logging
```typescript
// In service, logs include:
logger.log('Successfully authenticated');
logger.log(`Created campaign: ${campaignId}`);
logger.warn('Failed to logoff');
logger.error('Campaign push failed', error);
```

### Check Configuration
```bash
# Verify environment variables are set
echo $REVIVE_HOST
echo $REVIVE_USERNAME
# (Don't echo password!)
```

### Test XML-RPC Connection
```typescript
const healthy = await reviveApiService.healthCheck();
console.log(healthy); // true or false
```

## Testing

### Unit Tests
```bash
npm run test src/ad-server/revive-api.service.spec.ts
```

### Integration Tests
```bash
REVIVE_HOST=localhost:8000 npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Performance Notes

- **Session auth**: ~200-500ms
- **Per-operation**: ~200-300ms
- **Full campaign**: ~1-3 seconds (1 advertiser + 1 campaign + 1-2 banners + zones)
- **Max retries**: 3 (configurable)
- **Request timeout**: 30 seconds (configurable)

## Files Reference

| File | Purpose |
|------|---------|
| revive-api.service.ts | Main service implementation |
| ad-server.module.ts | NestJS module registration |
| ad-server.controller.ts | REST endpoints |
| revive-api.service.spec.ts | Unit tests |
| README.md | Complete API reference |
| ARCHITECTURE.md | System design document |
| IMPLEMENTATION_SUMMARY.md | Overview of all files |

---

For complete documentation, see:
- **README.md** - Full API reference and examples
- **ARCHITECTURE.md** - System design and patterns
- **IMPLEMENTATION_SUMMARY.md** - Overview of implementation
