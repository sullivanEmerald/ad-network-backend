export const REVIVE_PUBLISHER_METHODS = {
    ADD: 'ox.addPublisher',
    MODIFY: 'ox.modifyPublisher',
    DELETE: 'ox.deletePublisher',
    GET: 'ox.getPublisher',
    GET_LIST_BY_AGENCY: 'ox.getPublisherListByAgencyId',

    DAILY_STATISTICS: 'ox.publisherDailyStatistics',
    HOURLY_STATISTICS: 'ox.publisherHourlyStatistics',
    ZONE_STATISTICS: 'ox.publisherZoneStatistics',
    ADVERTISER_STATISTICS: 'ox.publisherAdvertiserStatistics',
    CAMPAIGN_STATISTICS: 'ox.publisherCampaignStatistics',
    BANNER_STATISTICS: 'ox.publisherBannerStatistics',
} as const;


export const REVIVE_TAG_CODE_TYPES = {
    IFRAME: 'invocationTags:oxInvocationTags:adframe',
    JAVASCRIPT: 'invocationTags:oxInvocationTags:adjs',
    NO_COOKIE_IMAGE: 'invocationTags:oxInvocationTags:adviewnocookies',
    ASYNC_JS: 'invocationTags:oxInvocationTags:async', // recommended default
};

