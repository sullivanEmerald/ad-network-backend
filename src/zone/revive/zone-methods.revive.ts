export const REVIVE_ZONE_METHODS = {
    ADD: 'ox.addZone',
    MODIFY: 'ox.modifyZone',
    DELETE: 'ox.deleteZone',
    GET: 'ox.getZone',
    GET_LIST_BY_PUBLISHER_ID: 'ox.getZoneListByPublisherId',

    LINK_BANNER: 'ox.linkBanner',
    UNLINK_BANNER: 'ox.unlinkBanner',

    LINK_CAMPAIGN: 'ox.linkCampaign',
    UNLINK_CAMPAIGN: 'ox.unlinkCampaign',

    GENERATE_TAGS: 'ox.generateTags',

    DAILY_STATISTICS: 'ox.zoneDailyStatistics',
    HOURLY_STATISTICS: 'ox.zoneHourlyStatistics',
    ADVERTISER_STATISTICS: 'ox.zoneAdvertiserStatistics',
    CAMPAIGN_STATISTICS: 'ox.zoneCampaignStatistics',
    BANNER_STATISTICS: 'ox.zoneBannerStatistics',
} as const;