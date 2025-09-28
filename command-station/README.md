# 🎯 Real Estate Scraper Command Station

A centralized control plane for managing and monitoring your real estate scraping system. Built as a Supabase Edge Function with TypeScript/Deno.

## 🏗️ Architecture Overview

```
command-station/
├── 🔧 index.ts             # Main command handler & router
├── 🎛️ dashboard.ts         # System status monitoring
├── ⚙️ controller.ts        # System controls & operations  
├── 📊 metrics.ts           # Performance tracking
├── 🔐 config-manager.ts    # Configuration management
├── 🚀 deploy.sh           # Deployment script
└── 📖 README.md           # This file
```

## ✨ Features

### 🎛️ System Control
- **Enable/Disable Scraping** - Toggle scraping system on/off
- **Immediate Batch Processing** - Trigger manual scraping runs
- **Configuration Management** - Update system settings dynamically
- **Emergency Stop** - Halt all operations instantly

### 📊 Real-time Monitoring
- **System Health Dashboard** - Overall system status
- **Performance Metrics** - Scraping speed, success rates, errors
- **Cost Tracking** - Daily/monthly spend monitoring
- **Claude AI Usage** - Token usage, accuracy metrics
- **Alert System** - Proactive issue detection

### 💰 Cost Management
- **Daily Spend Limits** - Automatic cost control
- **Per-Property Cost Analysis** - ROI tracking
- **Claude Usage Optimization** - Token efficiency monitoring
- **Budget Alerts** - Early warning system

## 🚀 Quick Start

### 1. Deploy Command Station

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 2. Access Endpoints

```bash
# System status dashboard
curl "https://your-project.supabase.co/functions/v1/command-station/status"

# Enable scraping
curl -X POST "https://your-project.supabase.co/functions/v1/command-station/enable-scraping"

# Get performance metrics  
curl "https://your-project.supabase.co/functions/v1/command-station/metrics"
```

## 📡 API Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | System status dashboard |
| `/enable-scraping` | POST | Enable scraping system |
| `/disable-scraping` | POST | Disable scraping system |
| `/run-now` | POST | Run immediate batch |
| `/metrics` | GET | Performance metrics |
| `/config` | GET/POST | Configuration management |
| `/health` | GET | Health check |

### Status Response Example

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "system": {
    "status": "🟢 RUNNING",
    "version": "1.0.0",
    "uptime": 86400,
    "health": "🟢 Healthy"
  },
  "scraping": {
    "enabled": true,
    "queue_size": 45,
    "last_completed": "2024-01-15T10:25:00Z",
    "next_scheduled": "2024-01-22T00:00:00Z",
    "success_rate": 0.97
  },
  "costs": {
    "daily": 12.45,
    "monthly": 234.56,
    "claude_usage": 8.20,
    "limit": 50.00,
    "remaining": 37.55
  },
  "claude": {
    "enabled": true,
    "requests_today": 245,
    "average_confidence": 0.89,
    "error_rate": 0.02
  }
}
```

### Metrics Response Example

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "performance": {
    "avg_scrape_time": 2500,
    "success_rate": 0.97,
    "claude_accuracy": 0.89,
    "throughput": 120,
    "error_rate": 0.03
  },
  "business": {
    "properties_monitored": 25430,
    "new_listings_today": 156,
    "price_changes_today": 89,
    "market_coverage": "87%",
    "data_freshness": "2h ago"
  },
  "costs": {
    "hourly_burn_rate": 1.25,
    "cost_per_property": 0.035,
    "claude_cost_breakdown": {
      "total_today": 15.67,
      "input_tokens": 4.70,
      "output_tokens": 10.97,
      "requests_count": 456
    },
    "efficiency_score": 87.5
  }
}
```

## ⚙️ Configuration

### Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLAUDE_API_KEY=your-claude-api-key

# Optional
SCRAPING_ENABLED=true
CLAUDE_ENABLED=true
BATCH_SIZE=50
DAILY_COST_LIMIT=50
SCRAPE_SCHEDULE="0 0 * * 0"
```

### Dynamic Configuration

Update configuration via API:

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/command-station/config" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 75,
    "dailyCostLimit": 60,
    "claudeEnabled": true
  }'
```

### Configuration Schema

```typescript
interface SystemConfig {
  scrapingEnabled: boolean
  claudeEnabled: boolean
  batchSize: number              // 1-1000
  dailyCostLimit: number         // USD
  schedule: string               // Cron expression
  maxRetries: number
  timeoutMs: number
  alertThresholds: {
    errorRate: number            // 0-1
    responseTime: number         // milliseconds
    costLimit: number            // USD
    memoryUsage: number          // 0-1
  }
}
```

## 🔧 Integration Options

### Option 1: Standalone Function (Recommended)

Deploy as a separate Supabase function:

```bash
supabase functions deploy command-station --no-verify-jwt
```

**Pros:**
- Isolated concerns
- Independent scaling
- Easier debugging
- Clean separation

### Option 2: Integrated with Worker

Add to existing `ai-scraper-worker`:

```typescript
// In ai-scraper-worker/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { CommandStation } from './command-station/index.ts'

serve(async (req: Request) => {
  const url = new URL(req.url)
  
  if (url.pathname.startsWith('/command-station')) {
    return await CommandStation.handle(req)
  }
  
  // ... existing worker logic
})
```

## 📊 Monitoring & Alerts

### Alert Thresholds

- **Error Rate**: > 5%
- **Response Time**: > 5 seconds  
- **Daily Cost**: > 90% of limit
- **Memory Usage**: > 80%

### Alert Channels

Configure webhook for alerts:

```json
{
  "integrations": {
    "monitoring": {
      "enabled": true,
      "alertWebhook": "https://hooks.slack.com/your-webhook"
    }
  }
}
```

## 🛠️ Development

### Local Testing

```bash
# Start local Supabase
supabase start

# Deploy function locally
supabase functions serve command-station

# Test endpoints
curl "http://localhost:54321/functions/v1/command-station/status"
```

### Adding New Endpoints

1. Add route in `index.ts`
2. Implement handler in appropriate module
3. Update this README
4. Test thoroughly

### Database Schema

The command station uses a `system_config` table:

```sql
CREATE TABLE system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚨 Troubleshooting

### Common Issues

**Function not responding:**
```bash
# Check function logs
supabase functions logs command-station
```

**Configuration not saving:**
```bash
# Verify database permissions
supabase db reset
```

**High costs:**
```bash
# Check current spend
curl "https://your-project.supabase.co/functions/v1/command-station/metrics"
```

### Debug Mode

Enable verbose logging:

```bash
# Set environment variable
export DEBUG=true

# Deploy with debug
supabase functions deploy command-station --debug
```

## 🔒 Security

### Access Control

- Uses Supabase RLS for data protection
- Service role required for configuration changes
- No authentication bypass options

### Best Practices

1. **Rotate API Keys** regularly
2. **Monitor access logs** for unusual activity  
3. **Set reasonable cost limits**
4. **Use webhooks** for critical alerts
5. **Regular backups** of configuration

## 📈 Performance Optimization

### Caching Strategy

- Configuration cached for 5 minutes
- Metrics cached for 30 seconds
- Status cached for 10 seconds

### Resource Limits

- Memory: 512MB max
- Timeout: 60 seconds
- Concurrent requests: 100

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Community Chat](https://discord.gg/your-channel)

---

**🎯 Happy Scraping!** 

Built with ❤️ for real estate professionals who demand reliable, cost-effective property data.