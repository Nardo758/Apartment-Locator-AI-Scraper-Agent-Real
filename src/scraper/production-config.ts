// Production Configuration for Data Integration Pipeline
// This file contains runtime configuration that can be overridden by environment variables

export interface ProductionConfig {
  // Database settings
  enableFrontendSync: boolean;
  frontendTable: string;
  
  // AI enhancement settings
  enableAiPricing: boolean;
  enableMarketIntelligence: boolean;
  claudeModel: string;
  
  // Performance settings
  batchSize: number;
  maxConcurrentTransformations: number;
  transformationTimeoutMs: number;
  
  // Cost management
  dailyCostLimit: number;
  enableCostTracking: boolean;
  
  // Geographic search
  defaultSearchRadiusMiles: number;
  maxSearchResults: number;
  
  // Calibration settings
  luxuryAmenityPremium: number;
  sizePremiumThreshold: number;
  qualityThresholdHigh: number;
  qualityThresholdMedium: number;
  
  // Error handling
  maxRetryAttempts: number;
  retryDelayMs: number;
  enableCircuitBreaker: boolean;
}

export const PRODUCTION_CONFIG: ProductionConfig = {
  // Database settings
  enableFrontendSync: process.env.ENABLE_FRONTEND_SYNC === 'true',
  frontendTable: process.env.FRONTEND_TABLE || 'properties',
  
  // AI enhancement settings
  enableAiPricing: process.env.ENABLE_AI_PRICING === 'true',
  enableMarketIntelligence: process.env.ENABLE_MARKET_INTELLIGENCE === 'true',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
  
  // Performance settings
  batchSize: parseInt(process.env.BATCH_SIZE || '50'),
  maxConcurrentTransformations: parseInt(process.env.MAX_CONCURRENT_TRANSFORMATIONS || '10'),
  transformationTimeoutMs: parseInt(process.env.TRANSFORMATION_TIMEOUT_MS || '30000'),
  
  // Cost management
  dailyCostLimit: parseFloat(process.env.DAILY_COST_LIMIT || '50'),
  enableCostTracking: process.env.ENABLE_COST_TRACKING === 'true',
  
  // Geographic search
  defaultSearchRadiusMiles: parseInt(process.env.DEFAULT_SEARCH_RADIUS_MILES || '10'),
  maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS || '100'),
  
  // Calibration settings (from testing)
  luxuryAmenityPremium: parseFloat(process.env.LUXURY_AMENITY_PREMIUM || '0.015'),
  sizePremiumThreshold: parseInt(process.env.SIZE_PREMIUM_THRESHOLD || '1000'),
  qualityThresholdHigh: parseFloat(process.env.QUALITY_THRESHOLD_HIGH || '0.9'),
  qualityThresholdMedium: parseFloat(process.env.QUALITY_THRESHOLD_MEDIUM || '0.7'),
  
  // Error handling
  maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000'),
  enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER === 'true'
};

// Validation function
export function validateProductionConfig(config: ProductionConfig): string[] {
  const errors: string[] = [];
  
  if (config.batchSize <= 0 || config.batchSize > 1000) {
    errors.push('batchSize must be between 1 and 1000');
  }
  
  if (config.dailyCostLimit <= 0) {
    errors.push('dailyCostLimit must be positive');
  }
  
  if (config.luxuryAmenityPremium < 0 || config.luxuryAmenityPremium > 0.1) {
    errors.push('luxuryAmenityPremium must be between 0 and 0.1');
  }
  
  if (config.qualityThresholdHigh <= config.qualityThresholdMedium) {
    errors.push('qualityThresholdHigh must be greater than qualityThresholdMedium');
  }
  
  return errors;
}

// Get configuration with validation
export function getValidatedProductionConfig(): ProductionConfig {
  const config = PRODUCTION_CONFIG;
  const errors = validateProductionConfig(config);
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
  
  return config;
}

// Feature flags
export const FEATURE_FLAGS = {
  enableGeographicSearch: process.env.ENABLE_GEOGRAPHIC_SEARCH !== 'false',
  enableBatchProcessing: process.env.ENABLE_BATCH_PROCESSING !== 'false',
  enableRealTimeSync: process.env.ENABLE_REAL_TIME_SYNC !== 'false',
  enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false'
};

// Logging configuration
export const LOGGING_CONFIG = {
  debug: process.env.DEBUG === 'true',
  verboseTransformation: process.env.VERBOSE_TRANSFORMATION === 'true',
  enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_MONITORING === 'true'
};
