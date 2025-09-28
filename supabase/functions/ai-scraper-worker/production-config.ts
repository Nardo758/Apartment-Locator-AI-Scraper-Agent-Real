/**
 * Production Configuration for Claude-Powered AI Scraper
 * 
 * This file contains all production settings and configurations
 * for optimal performance and reliability.
 */

export const PRODUCTION_CONFIG = {
  // Claude API Configuration
  claude: {
    model: "claude-3-haiku-20240307",
    maxTokens: 2000,
    temperature: 0.1,
    timeout: 30000,
  },

  // Performance Settings
  performance: {
    maxConcurrentRequests: 10,
    requestTimeout: 30000,
    retryAttempts: 3,
    batchSize: 5,
    rateLimitDelay: 1000,
  },

  // Cost Management
  costs: {
    alertThreshold: 50.00,
    dailyBudgetLimit: 100.00,
    trackingEnabled: true,
    
    // Claude Haiku Pricing (per 1M tokens)
    pricing: {
      inputTokens: 0.80,
      outputTokens: 4.00,
    }
  },

  // Validation Rules
  validation: {
    strictMode: true,
    requiredFields: ["name", "address", "city", "state", "current_price"],
    priceRange: { min: 0, max: 50000 },
    bedroomRange: { min: 0, max: 10 },
    bathroomRange: { min: 0, max: 10 },
    stateFormat: /^[A-Z]{2}$/,
  },

  // Database Settings
  database: {
    savingEnabled: true,
    costAggregationEnabled: true,
    batchInsertSize: 100,
    connectionTimeout: 10000,
  },

  // Monitoring & Logging
  monitoring: {
    logLevel: "info",
    performanceLogging: true,
    errorTracking: true,
    metricsCollection: true,
  },

  // Feature Flags
  features: {
    enableDatabaseSaving: true,
    enableCostTracking: true,
    enablePerformanceMetrics: true,
    enableErrorRetry: true,
    enableRateLimiting: true,
  },

  // Alert Thresholds
  alerts: {
    successRate: 0.95,        // Alert if <95%
    avgResponseTime: 3000,    // Alert if >3s
    dailyCost: 50.00,         // Alert if >$50/day
    errorRate: 0.05,          // Alert if >5% errors
    tokenUsageSpike: 1.5,     // Alert if 50% above average
  }
} as const;

export const CLAUDE_SYSTEM_PROMPT = `You are an expert web scraper for apartment rental data.
Extract the following fields from HTML and return ONLY valid JSON:
- name, address, city, state (2 letters)
- current_price (number only, no symbols)
- bedrooms, bathrooms (numbers, use 0 for studio apartments)
- free_rent_concessions (text description)
- application_fee (number or null)
- admin_fee_waived (boolean)
- admin_fee_amount (number or null)

Return valid JSON. Use null for missing fields. Be precise with numbers.`;

export const ERROR_MESSAGES = {
  CLAUDE_API_ERROR: "Claude API request failed",
  INVALID_JSON: "Claude returned invalid JSON",
  VALIDATION_FAILED: "Extracted data failed validation",
  DATABASE_ERROR: "Failed to save to database",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded, please retry",
  TIMEOUT_ERROR: "Request timeout exceeded",
  AUTHENTICATION_ERROR: "Invalid API credentials",
} as const;

export const HTTP_STATUS_CODES = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  TIMEOUT: 504,
} as const;