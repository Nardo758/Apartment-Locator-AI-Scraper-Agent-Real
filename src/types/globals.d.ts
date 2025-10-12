import { SharedScrapedProperty as _SSP } from './scraped-property.ts';

declare global {
  // Make SharedScrapedProperty available globally to avoid mass import churn
  type SharedScrapedProperty = _SSP;
}

export {};
