export const REVIVE_AGENCY_METHODS = {
    ADD: 'ox.addAgency',
    MODIFY: 'ox.modifyAgency',
    DELETE: 'ox.deleteAgency',
    GET: 'ox.getAgency',
    GET_LIST: 'ox.getAgencyList',

    DAILY_STATISTICS: 'ox.agencyDailyStatistics',
    HOURLY_STATISTICS: 'ox.agencyHourlyStatistics',
    ADVERTISER_STATISTICS: 'ox.agencyAdvertiserStatistics',
    CAMPAIGN_STATISTICS: 'ox.agencyCampaignStatistics',
    BANNER_STATISTICS: 'ox.agencyBannerStatistics',
    PUBLISHER_STATISTICS: 'ox.agencyPublisherStatistics',
    ZONE_STATISTICS: 'ox.agencyZoneStatistics',
} as const;