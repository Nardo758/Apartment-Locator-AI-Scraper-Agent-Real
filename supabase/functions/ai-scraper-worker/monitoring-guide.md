# 📊 Monitoring & Scaling Guide
## Claude-Powered AI Apartment Scraper

### 🎯 Key Performance Indicators (KPIs)

| Metric | Target | Alert Threshold | Critical Threshold |
|--------|--------|-----------------|-------------------|
| **Success Rate** | >95% | <95% | <90% |
| **Response Time** | <3s | >3s | >5s |
| **Daily Cost** | <$50 | >$50 | >$100 |
| **Accuracy Rate** | >90% | <90% | <85% |
| **Error Rate** | <5% | >5% | >10% |
| **Token Usage** | Baseline +20% | +50% | +100% |

---

## 📈 Monitoring Dashboard Setup

### Supabase Dashboard Metrics

```sql
-- Daily Performance Query
SELECT 
    date,
    properties_scraped,
    estimated_cost,
    success_rate,
    avg_response_time,
    error_count
FROM daily_performance
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Cost Trend Analysis
SELECT 
    DATE_TRUNC('week', date) as week,
    SUM(properties_scraped) as weekly_properties,
    SUM(estimated_cost) as weekly_cost,
    AVG(success_rate) as avg_success_rate
FROM scraping_costs
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', date)
ORDER BY week DESC;

-- Error Pattern Analysis
SELECT 
    error_type,
    COUNT(*) as error_count,
    MAX(occurred_at) as latest_occurrence
FROM error_logs
WHERE occurred_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY error_type
ORDER BY error_count DESC;
```

### Real-Time Monitoring Queries

```sql
-- Current Day Performance
SELECT * FROM get_daily_cost_summary(1);

-- Apartment Statistics
SELECT * FROM get_apartment_stats();

-- Recent Errors (Last 24 hours)
SELECT 
    error_type,
    error_message,
    occurred_at,
    severity
FROM error_logs
WHERE occurred_at >= NOW() - INTERVAL '24 hours'
ORDER BY occurred_at DESC
LIMIT 20;
```

---

## 🚨 Alert Configuration

### Cost Alerts

```javascript
// Daily cost monitoring
const COST_ALERTS = {
  daily_budget: 50.00,      // Alert if daily cost > $50
  weekly_budget: 300.00,    // Alert if weekly cost > $300
  monthly_budget: 1200.00,  // Alert if monthly cost > $1200
  
  // Per-property cost spike
  cost_per_property: 0.002, // Alert if >$0.002 per property
  
  // Token usage spike
  token_spike_threshold: 1.5 // Alert if 50% above baseline
};

// Implementation example
async function checkCostAlerts() {
  const dailyCost = await getDailyCost();
  if (dailyCost > COST_ALERTS.daily_budget) {
    await sendAlert('COST_ALERT', `Daily cost $${dailyCost} exceeded budget $${COST_ALERTS.daily_budget}`);
  }
}
```

### Performance Alerts

```javascript
// Performance monitoring
const PERFORMANCE_ALERTS = {
  success_rate_threshold: 0.95,    // Alert if <95%
  response_time_threshold: 3000,   // Alert if >3s
  error_rate_threshold: 0.05,      // Alert if >5%
  
  // Volume alerts
  low_volume_threshold: 100,       // Alert if <100 properties/day
  high_volume_threshold: 10000,    // Alert if >10k properties/day
};
```

---

## 📊 Performance Monitoring

### Response Time Tracking

```typescript
// Add to your function for performance tracking
const startTime = Date.now();
// ... Claude API call ...
const responseTime = Date.now() - startTime;

// Log performance metrics
await logPerformanceMetric({
  responseTime,
  tokenCount: usage.total_tokens,
  success: true,
  timestamp: new Date()
});
```

### Success Rate Monitoring

```sql
-- Hourly success rate
SELECT 
    DATE_TRUNC('hour', scraped_at) as hour,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE is_active = true) as successful,
    ROUND(
        COUNT(*) FILTER (WHERE is_active = true)::NUMERIC / COUNT(*)::NUMERIC * 100, 
        2
    ) as success_rate_percent
FROM apartments
WHERE scraped_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', scraped_at)
ORDER BY hour DESC;
```

---

## 🔧 Scaling Guidelines

### Traffic-Based Scaling

| Daily Properties | Recommended Setup | Expected Cost | Notes |
|-----------------|-------------------|---------------|-------|
| **1-1,000** | Single instance | $0.72-$72 | Standard setup |
| **1,000-10,000** | Load balancing | $72-$720 | Monitor rate limits |
| **10,000-50,000** | Auto-scaling | $720-$3,600 | Batch optimization |
| **50,000+** | Multi-region | $3,600+ | Enterprise setup |

### Horizontal Scaling Strategy

```typescript
// Batch processing for high volume
const SCALING_CONFIG = {
  low_volume: {
    batch_size: 1,
    concurrent_requests: 1,
    delay_ms: 1000
  },
  medium_volume: {
    batch_size: 5,
    concurrent_requests: 3,
    delay_ms: 500
  },
  high_volume: {
    batch_size: 10,
    concurrent_requests: 5,
    delay_ms: 200
  }
};

// Auto-scaling logic
function getOptimalConfig(dailyVolume: number) {
  if (dailyVolume < 1000) return SCALING_CONFIG.low_volume;
  if (dailyVolume < 10000) return SCALING_CONFIG.medium_volume;
  return SCALING_CONFIG.high_volume;
}
```

---

## 🎛️ Performance Optimization

### Claude API Optimization

```typescript
// Optimized Claude configuration for production
const OPTIMIZED_CLAUDE_CONFIG = {
  model: "claude-3-haiku-20240307", // Most cost-effective
  max_tokens: 1000,                 // Reduced for apartment data
  temperature: 0.1,                 // Consistent results
  timeout: 20000,                   // Faster timeout
};

// Connection pooling and reuse
const httpClient = new HTTPClient({
  keepAlive: true,
  maxSockets: 10,
  timeout: 20000
});
```

### Database Optimization

```sql
-- Optimize apartment insertions with batch processing
CREATE OR REPLACE FUNCTION batch_insert_apartments(
    apartments_data JSONB[]
) RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    INSERT INTO apartments (
        external_id, source, title, address, city, state,
        rent_price, bedrooms, bathrooms, scraped_at
    )
    SELECT 
        (data->>'external_id')::TEXT,
        (data->>'source')::TEXT,
        (data->>'title')::TEXT,
        (data->>'address')::TEXT,
        (data->>'city')::TEXT,
        (data->>'state')::TEXT,
        (data->>'rent_price')::NUMERIC,
        (data->>'bedrooms')::INTEGER,
        (data->>'bathrooms')::NUMERIC,
        NOW()
    FROM unnest(apartments_data) AS data
    ON CONFLICT (external_id) DO UPDATE SET
        title = EXCLUDED.title,
        rent_price = EXCLUDED.rent_price,
        updated_at = NOW();
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔍 Troubleshooting Guide

### Common Issues & Solutions

#### High Response Times
```bash
# Check Claude API status
curl -I https://api.anthropic.com/v1/messages

# Monitor function logs
supabase functions logs ai-scraper-worker --follow

# Check database performance
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

#### Cost Spikes
```sql
-- Identify expensive requests
SELECT 
    date,
    estimated_cost,
    tokens_used,
    properties_scraped,
    estimated_cost / properties_scraped as cost_per_property
FROM scraping_costs
WHERE estimated_cost > 10.00
ORDER BY estimated_cost DESC;
```

#### Accuracy Issues
```sql
-- Analyze validation failures
SELECT 
    error_type,
    COUNT(*) as failure_count,
    error_details->>'field' as problematic_field
FROM error_logs
WHERE error_type = 'VALIDATION_FAILED'
GROUP BY error_type, error_details->>'field'
ORDER BY failure_count DESC;
```

---

## 📱 Monitoring Tools & Integrations

### Supabase Native Monitoring

```javascript
// Dashboard widgets
const DASHBOARD_WIDGETS = [
  {
    title: "Daily Properties Scraped",
    query: "SELECT SUM(properties_scraped) FROM scraping_costs WHERE date = CURRENT_DATE",
    type: "number"
  },
  {
    title: "Success Rate (7 days)",
    query: "SELECT AVG(success_rate) FROM scraping_costs WHERE date >= CURRENT_DATE - 7",
    type: "percentage"
  },
  {
    title: "Daily Cost",
    query: "SELECT SUM(estimated_cost) FROM scraping_costs WHERE date = CURRENT_DATE",
    type: "currency"
  }
];
```

### External Monitoring Integration

```typescript
// Webhook alerts
async function sendWebhookAlert(alertType: string, message: string) {
  await fetch(process.env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alert_type: alertType,
      message: message,
      timestamp: new Date().toISOString(),
      service: 'claude-ai-scraper'
    })
  });
}

// Email alerts
async function sendEmailAlert(subject: string, body: string) {
  // Integration with your email service
  await emailService.send({
    to: process.env.ALERT_EMAIL,
    subject: `[AI Scraper Alert] ${subject}`,
    body: body
  });
}
```

---

## 🎯 Performance Benchmarks

### Expected Performance Ranges

| Metric | Excellent | Good | Acceptable | Poor |
|--------|-----------|------|------------|------|
| **Success Rate** | >98% | 95-98% | 90-95% | <90% |
| **Response Time** | <1.5s | 1.5-3s | 3-5s | >5s |
| **Cost per Property** | <$0.0005 | $0.0005-0.001 | $0.001-0.002 | >$0.002 |
| **Accuracy** | >95% | 90-95% | 85-90% | <85% |

### Optimization Targets

```typescript
// Performance targets by volume
const PERFORMANCE_TARGETS = {
  low_volume: {    // <1k properties/day
    response_time: 1000,
    success_rate: 0.98,
    cost_per_property: 0.0007
  },
  medium_volume: { // 1k-10k properties/day
    response_time: 2000,
    success_rate: 0.96,
    cost_per_property: 0.0008
  },
  high_volume: {   // >10k properties/day
    response_time: 3000,
    success_rate: 0.95,
    cost_per_property: 0.001
  }
};
```

---

## 🚀 Scaling Roadmap

### Phase 1: Foundation (0-1k properties/day)
- ✅ Single Claude instance
- ✅ Basic monitoring
- ✅ Cost tracking
- ✅ Error logging

### Phase 2: Growth (1k-10k properties/day)
- 🔄 Load balancing
- 🔄 Advanced monitoring
- 🔄 Automated alerts
- 🔄 Performance optimization

### Phase 3: Scale (10k+ properties/day)
- 📋 Multi-region deployment
- 📋 Auto-scaling groups
- 📋 Advanced caching
- 📋 ML-powered optimization

---

## ✅ Monitoring Checklist

### Daily Monitoring Tasks
- [ ] Check success rate (target: >95%)
- [ ] Review daily costs (budget: <$50)
- [ ] Monitor error logs
- [ ] Verify data quality

### Weekly Monitoring Tasks
- [ ] Analyze performance trends
- [ ] Review cost efficiency
- [ ] Update scaling parameters
- [ ] Optimize problematic patterns

### Monthly Monitoring Tasks
- [ ] Performance benchmark review
- [ ] Cost optimization analysis
- [ ] Scaling strategy adjustment
- [ ] System health assessment

---

🎯 **Your Claude-powered scraper is now equipped with enterprise-grade monitoring and scaling capabilities!**