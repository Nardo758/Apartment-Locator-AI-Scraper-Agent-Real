export type CostPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';

export interface ScrapingTier {
  conditions: string[];
  frequency: string; // human-readable frequency (e.g. '1 day', '7 days')
  cost_priority: CostPriority;
}

export interface ScrapingStrategy {
  TIER_1: ScrapingTier;
  TIER_2: ScrapingTier;
  TIER_3: ScrapingTier;
  TIER_4: ScrapingTier;
}

export const SCRAPING_STRATEGY: ScrapingStrategy = {
  TIER_1: {
    // High volatility - scrape daily
    conditions: [
      'price_changes > 2 IN LAST_7_DAYS',
      'days_on_market < 7', // New listings
      'has_active_concessions = true',
      'price_reductions > 0'
    ],
    frequency: '1 day',
    cost_priority: 'HIGH'
  },
  TIER_2: {
    // Medium volatility - scrape weekly
    conditions: [
      'days_on_market BETWEEN 7 AND 30',
      '0-1 price changes in last 14 days'
    ],
    frequency: '7 days',
    cost_priority: 'MEDIUM'
  },
  TIER_3: {
    // Low volatility - scrape bi-weekly
    conditions: [
      'days_on_market > 30',
      'no price changes in last 30 days',
      'status = stable'
    ],
    frequency: '14 days',
    cost_priority: 'LOW'
  },
  TIER_4: {
    // Inactive - scrape monthly
    conditions: [
      'status = leased',
      'no activity in 60 days'
    ],
    frequency: '30 days',
    cost_priority: 'MINIMAL'
  }
};
