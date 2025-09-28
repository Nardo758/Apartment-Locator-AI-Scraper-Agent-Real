# 🔄 Data Integration Pipeline - Real Estate Scraper

Complete data transformation pipeline for converting scraper data to frontend-compatible format with AI enhancements, market intelligence, and geographic search capabilities.

## 🏗️ Architecture Overview

```
Current Scraper Data (scraped_properties)
                ↓
    Data Transformation Pipeline
                ↓
   Frontend Schema (properties + related tables)
                ↓
        Geographic Search & AI Analysis
```

## 📊 Schema Mapping

### Source → Target Transformation

| **Scraped Properties** | **Frontend Properties** | **Enhancement** |
|----------------------|----------------------|----------------|
| `external_id` | `external_id` | ✅ Direct mapping |
| `name` | `name` | ✅ Direct mapping |
| `address` | `address` | ✅ Direct mapping |
| `current_price` | `original_price` | ✅ Direct mapping |
| `current_price` | `ai_price` | 🤖 AI calculation |
| `current_price` | `effective_price` | 💰 Concession calculation |
| `bedrooms/bathrooms` | `bedrooms/bathrooms` | ✅ Direct mapping |
| `square_feet` | `sqft` | ✅ Direct mapping |
| `free_rent_concessions` | `amenities/features` | 🔍 Text extraction |
| Raw data | `apartment_iq_data` | 🧠 Market intelligence |

## 🚀 Quick Start

### 1. Deploy Frontend Schema

```bash
# Run the schema migration
psql -h your-db-host -d your-db -f src/scraper/frontend-schema-migration.sql

# Or using Supabase CLI
supabase db reset
```

### 2. Verify Schema Integration

```bash
# Run verification queries
psql -h your-db-host -d your-db -f src/scraper/schema-verification.sql
```

### 3. Test Data Integration

```typescript
// Run integration tests
deno run --allow-env --allow-net src/scraper/integration-test.ts

// Or with Node.js
npx tsx src/scraper/integration-test.ts
```

## 📝 Usage Examples

### Basic Data Transformation

```typescript
import { transformScrapedToFrontendFormat } from './data-transformer';

// Transform single property
const scrapedData = {
  external_id: 'apt_123_1',
  name: 'Luxury Downtown Apartment',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  current_price: 2500,
  bedrooms: 2,
  bathrooms: 2.0,
  // ... other fields
};

const frontendProperty = await transformScrapedToFrontendFormat(scrapedData);
console.log('AI Price:', frontendProperty.ai_price);
console.log('Effective Price:', frontendProperty.effective_price);
console.log('Market Intelligence:', frontendProperty.apartment_iq_data);
```

### Batch Processing with Frontend Sync

```typescript
import { getScrapingBatchWithTransformation, syncToFrontendSchema } from './orchestrator';

// Get batch with automatic transformation
const { jobs, frontendProperties } = await getScrapingBatchWithTransformation(
  supabase, 
  100,  // batch size
  true  // enable frontend sync
);

// Sync to frontend schema
const syncResult = await syncToFrontendSchema(
  supabase, 
  frontendProperties, 
  'properties'
);

console.log(`Synced ${syncResult.success} properties`);
```

### Enhanced Batch Processing

```typescript
import { processBatchWithCostOptimization } from './processor';

// Process batch with frontend integration
const results = await processBatchWithCostOptimization(
  supabase,
  batch,
  {
    enableFrontendSync: true,
    frontendTable: 'properties'
  }
);

// Check sync results
const syncInfo = results.find(r => r.frontend_sync);
console.log('Frontend sync:', syncInfo);
```

### Geographic Search

```sql
-- Search properties near Austin, TX
SELECT * FROM search_properties_near_location(
  30.2672,  -- latitude
  -97.7431, -- longitude
  10,       -- radius in miles
  1,        -- min bedrooms
  3,        -- max bedrooms
  1000,     -- min price
  3000      -- max price
);
```

## 🤖 AI Enhancement Features

### 1. AI Price Calculation

```typescript
// Automatic AI price suggestions based on:
// - Market rent data (30% weight)
// - Property size (5% premium for >1000 sqft)
// - Luxury amenities (2% per luxury amenity)
// - Location factors

const aiPrice = await calculateAiPrice(scrapedData);
```

### 2. Effective Price Calculation

```typescript
// Considers concessions and fees:
// - Free rent concessions (amortized)
// - Application fees (monthly equivalent)
// - Admin fees (monthly equivalent)

const effectivePrice = await calculateEffectivePrice(scrapedData);
```

### 3. Market Intelligence (Apartment IQ)

```typescript
// Generates market intelligence including:
// - Market position (below/at/above market)
// - Price trend analysis
// - Demand level assessment
// - Competitiveness score
// - Recommendations

const iqData = await generateIqData(scrapedData);
```

## 📊 Data Quality & Validation

### Schema Verification

```bash
# Check all required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('properties', 'scraped_properties', 'apartment_iq_data');

# Verify column compatibility
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'properties' 
ORDER BY ordinal_position;
```

### Data Quality Assessment

```sql
-- Assess transformation readiness
SELECT 
  COUNT(*) as total_properties,
  COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as has_name,
  COUNT(CASE WHEN current_price > 0 THEN 1 END) as has_valid_price,
  ROUND(AVG(CASE 
    WHEN name IS NOT NULL AND address IS NOT NULL 
         AND current_price > 0 THEN 1 ELSE 0 
  END) * 100, 2) as transformation_ready_percent
FROM scraped_properties;
```

## 🔧 Configuration Options

### Environment Variables

```bash
# Required for data transformation
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional enhancements
ENABLE_AI_PRICING=true
ENABLE_MARKET_INTELLIGENCE=true
ENABLE_GEOGRAPHIC_SEARCH=true
DEFAULT_FRONTEND_TABLE=properties

# Geographic search settings
DEFAULT_SEARCH_RADIUS_MILES=10
MAX_SEARCH_RESULTS=100
```

### Transformation Settings

```typescript
// Configure transformation behavior
const transformationConfig = {
  enableAiPricing: true,
  enableMarketIntelligence: true,
  aiPricingWeight: 0.3,  // 30% weight to market data
  sizePremiumThreshold: 1000,  // sqft for size premium
  luxuryAmenities: ['pool', 'gym', 'concierge', 'doorman'],
  concessionAmortizationPeriod: 12  // months
};
```

## 📈 Performance Optimization

### Indexing Strategy

```sql
-- Critical indexes for performance
CREATE INDEX idx_properties_external_id ON properties(external_id);
CREATE INDEX idx_properties_geo ON properties(latitude, longitude);
CREATE INDEX idx_properties_price_range ON properties(original_price, bedrooms);
CREATE INDEX idx_properties_location ON properties(city, state);
```

### Batch Processing Tips

```typescript
// Optimize batch sizes for your system
const OPTIMAL_BATCH_SIZES = {
  transformation: 100,    // Properties per transformation batch
  databaseSync: 50,      // Properties per database sync
  aiProcessing: 25       // Properties per AI analysis batch
};

// Process in chunks for large datasets
async function processLargeDataset(properties: ScrapedPropertyData[]) {
  const chunks = chunkArray(properties, OPTIMAL_BATCH_SIZES.transformation);
  
  for (const chunk of chunks) {
    const transformed = await batchTransformProperties(chunk);
    await syncToFrontendSchema(supabase, transformed);
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

## 🔍 Monitoring & Debugging

### Data Transformation Metrics

```typescript
// Monitor transformation success rates
const metrics = {
  totalProcessed: 0,
  successfulTransformations: 0,
  aiPricingSuccessRate: 0,
  marketIntelligenceSuccessRate: 0,
  syncSuccessRate: 0
};

// Log transformation details
console.log('Transformation Metrics:', {
  successRate: (metrics.successfulTransformations / metrics.totalProcessed) * 100,
  aiPricingAccuracy: metrics.aiPricingSuccessRate,
  syncEfficiency: metrics.syncSuccessRate
});
```

### Error Handling

```typescript
// Comprehensive error handling
try {
  const frontendProperty = await transformScrapedToFrontendFormat(scrapedData);
} catch (error) {
  if (error.message.includes('invalid price')) {
    // Handle price validation errors
    console.warn('Price validation failed:', scrapedData.external_id);
  } else if (error.message.includes('missing required field')) {
    // Handle missing data errors
    console.warn('Required field missing:', scrapedData.external_id);
  } else {
    // Handle unexpected errors
    console.error('Transformation error:', error);
  }
}
```

## 🧪 Testing

### Unit Tests

```bash
# Test individual transformation functions
deno test src/scraper/__tests__/data-transformer.test.ts

# Test orchestrator integration
deno test src/scraper/__tests__/orchestrator.test.ts
```

### Integration Tests

```bash
# Full pipeline test
deno run --allow-env --allow-net src/scraper/integration-test.ts

# Specific component tests
npm run test:transformation
npm run test:schema-validation
npm run test:geographic-search
```

### Sample Test Data

```typescript
// Create test fixtures
export const TEST_SCRAPED_PROPERTIES = [
  {
    external_id: 'test_001',
    name: 'Test Apartment 1',
    current_price: 2500,
    bedrooms: 2,
    bathrooms: 2.0,
    // ... complete test data
  }
];

// Run transformation tests
const results = await batchTransformProperties(TEST_SCRAPED_PROPERTIES);
assert(results.length === TEST_SCRAPED_PROPERTIES.length);
```

## 🚀 Production Deployment

### 1. Database Migration

```bash
# Deploy schema changes
supabase db push

# Or manually
psql -h prod-db -d prod -f frontend-schema-migration.sql
```

### 2. Function Deployment

```bash
# Deploy updated scraper functions
supabase functions deploy ai-scraper-worker
supabase functions deploy scraper-orchestrator
```

### 3. Environment Setup

```bash
# Set production environment variables
supabase secrets set ENABLE_FRONTEND_SYNC=true
supabase secrets set FRONTEND_TABLE=properties
supabase secrets set ENABLE_AI_PRICING=true
```

### 4. Monitoring Setup

```typescript
// Production monitoring
const monitor = {
  transformationRate: 0,
  errorRate: 0,
  syncLatency: 0,
  dataQualityScore: 0
};

// Set up alerts
if (monitor.errorRate > 0.05) {  // 5% error rate threshold
  await sendAlert('High transformation error rate detected');
}
```

## 📚 API Reference

### Core Functions

| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `transformScrapedToFrontendFormat()` | Transform single property | `ScrapedPropertyData` | `FrontendProperty` |
| `batchTransformProperties()` | Transform multiple properties | `ScrapedPropertyData[]` | `FrontendProperty[]` |
| `calculateAiPrice()` | AI price calculation | `ScrapedPropertyData` | `number` |
| `generateIqData()` | Market intelligence | `ScrapedPropertyData` | `ApartmentIQData` |
| `syncToFrontendSchema()` | Save to frontend tables | `FrontendProperty[]` | `SyncResult` |

### SQL Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `search_properties_near_location()` | Geographic search | lat, lng, radius, filters |
| `calculate_ai_price_estimate()` | Server-side AI pricing | property details |
| `calculate_effective_price()` | Server-side effective pricing | price, concessions, fees |

## 🎯 Best Practices

### 1. Data Quality

- ✅ Validate all required fields before transformation
- ✅ Handle missing data gracefully with defaults
- ✅ Log data quality metrics for monitoring
- ✅ Implement data cleansing for common issues

### 2. Performance

- ✅ Process data in optimal batch sizes
- ✅ Use database indexes for frequent queries
- ✅ Cache transformation results when appropriate
- ✅ Monitor and optimize AI processing costs

### 3. Error Handling

- ✅ Implement comprehensive error logging
- ✅ Use circuit breakers for external services
- ✅ Provide fallback values for AI features
- ✅ Monitor transformation success rates

### 4. Scalability

- ✅ Design for horizontal scaling
- ✅ Use queues for large batch processing
- ✅ Implement rate limiting for AI services
- ✅ Plan for data growth and archiving

## 🔗 Related Documentation

- [Command Station README](../command-station/README.md)
- [Scraper Architecture](../../docs/architecture.md)
- [API Documentation](../../docs/api.md)
- [Database Schema](../../docs/database-schema.md)

---

**🎉 Your data integration pipeline is ready!** Transform your scraped property data into a powerful, AI-enhanced frontend experience with geographic search, market intelligence, and real-time pricing analysis.