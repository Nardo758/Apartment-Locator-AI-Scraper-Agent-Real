# 🎯 Real Estate Scraper Command Station

Central command and control interface for the real estate scraping system. Provides comprehensive monitoring, control, and configuration management capabilities.

## 🏗️ Architecture

The Command Station is built with a modular architecture:

    command-station/
    ├── 🔧 index.ts             # Main command handler & routing
    ├── 🎛️ dashboard.ts         # Real-time status monitoring
    ├── ⚙️ controller.ts        # System control operations
    ├── 📊 metrics.ts           # Performance tracking & analytics
    ├── 🔐 config-manager.ts    # Configuration management
    └── 📚 README.md            # This documentation

## 🚀 Quick Start

### 1. Deploy the Function

    # Deploy to Supabase
    supabase functions deploy command-station --no-verify-jwt

    # Or deploy with verification (if auth is required)
    supabase functions deploy command-station

### 2. Basic Usage

    # Check system status
    curl "https://your-project.supabase.co/functions/v1/command-station/status"

    # Enable scraping
    curl -X POST "https://your-project.supabase.co/functions/v1/command-station/enable-scraping"

    # Run immediate batch
    curl -X POST "https://your-project.supabase.co/functions/v1/command-station/run-now"

    # Get help
  curl "<https://your-project.supabase.co/functions/v1/command-station/help>"

## 📡 API Endpoints

### System Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Complete system dashboard |
| `/metrics` | GET | Performance metrics |
| `/health` | GET | System health check |
| `/activity` | GET | Recent system activity |

### System Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/enable-scraping` | POST | Enable scraping system |
| `/disable-scraping` | POST | Disable scraping system |
| `/run-now` | POST | Trigger immediate batch |
| `/emergency-stop` | POST | Emergency halt |

### Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/config` | GET | Get current configuration |
| `/config` | POST | Update configuration |
| `/export-config` | GET | Export configuration |
| `/import-config` | POST | Import configuration |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trends/{metric}` | GET | Metric trend data |
| `/batch/{id}` | GET | Batch status |

## 🎛️ System Status Dashboard

The `/status` endpoint provides a comprehensive system overview:

    {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "system": {
        "status": "🟢 RUNNING",
        "version": "1.0.0",
        "uptime": 3600,
        "environment": "production"
      },
      "scraping": {
        "enabled": true,
        "status": "running",
        "queue_size": 25,
        "active_jobs": 3,
        "last_completed": "2024-01-01T11:45:00.000Z",
        "next_scheduled": "2024-01-01T18:00:00.000Z",
        "success_rate": 94.5
      },
      "costs": {
        "daily": 12.45,
        "weekly": 87.15,
        "monthly": 245.67,
        "limit": 50.00,
        "utilization": 0.249,
        "projected_monthly": 373.50
      },
      "claude": {
        "enabled": true,
        "model": "claude-3-haiku-20240307",
        "requests_today": 156,
        "average_confidence": 0.92,
        "token_usage": {
          "input": 45678,
          "output": 12345,
          "total": 58023
        }
      },
      "alerts": [
        {
          "level": "warning",
          "message": "Daily cost approaching limit: $40.25 (80.5%)",
          "timestamp": "2024-01-01T12:00:00.000Z",
          "component": "system"
        }
      ],
      "health": {
        "database": "healthy",
        "workers": "healthy",
        "apis": "healthy",
        "overall": "healthy"
      }
    }

## ⚙️ Configuration Management

### Default Configuration

    {
      "scrapingEnabled": true,
      "claudeEnabled": true,
      "batchSize": 50,
      "dailyCostLimit": 50,
      "schedule": "0 0 * * 0",
      "maxConcurrentJobs": 5,
      "enableCostTracking": true,
      "claudeModel": "claude-3-haiku-20240307",
      "retryAttempts": 3,
      "timeoutMs": 30000,
      "alertThresholds": {
        "dailyCost": 40,
        "errorRate": 0.15,
        "queueSize": 100
      },
      "features": {
        "autoRetry": true,
        "smartBatching": true,
        "costOptimization": true,
        "realTimeMonitoring": true
      }
    }

### Update Configuration

    curl -X POST "https://your-project.supabase.co/functions/v1/command-station/config" \
      -H "Content-Type: application/json" \
      -d '{
        "batchSize": 25,
        "dailyCostLimit": 75,
        "claudeModel": "claude-3-sonnet-20240229"
      }'

## 📊 Metrics & Analytics

### Available Metrics

- **Performance**: `error_rate`, `success_rate`, `throughput`, `response_time`
- **Business**: `properties_monitored`, `new_listings`, `price_changes`
- **Costs**: `daily_cost`, `weekly_cost`, `monthly_cost`
- **System**: `queue_size`, `database_size`, `function_calls`

### Get Trend Data

    # Get 24-hour error rate trend
    curl "https://your-project.supabase.co/functions/v1/command-station/trends/error_rate?range=24h&granularity=1h"

    # Get 7-day cost trend
    curl "https://your-project.supabase.co/functions/v1/command-station/trends/daily_cost?range=7d&granularity=6h"

## 🚨 Control Operations

### Enable/Disable System

    # Enable scraping
    curl -X POST "https://your-project.supabase.co/functions/v1/command-station/enable-scraping"

    # Disable scraping
    curl -X POST "https://your-project.supabase.co/functions/v1/command-station/disable-scraping"

### Batch Processing

    # Trigger immediate batch
    curl -X POST "https://your-project.supabase.co/functions/v1/command-station/run-now"

    # Check batch status
    curl "https://your-project.supabase.co/functions/v1/command-station/batch/batch_1234567890_abc123"

### Emergency Operations

    # Emergency stop (halts all operations)
    curl -X POST "https://your-project.supabase.co/functions/v1/command-station/emergency-stop"

## 🔧 Database Schema Requirements

The Command Station requires these database tables:

    -- System configuration
    CREATE TABLE system_config (
      config_key TEXT PRIMARY KEY,
      config_value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- System events log
    CREATE TABLE system_events (
      id BIGSERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      event_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Batch job tracking
    CREATE TABLE batch_jobs (
      id BIGSERIAL PRIMARY KEY,
      batch_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      batch_size INTEGER,
      properties_processed INTEGER DEFAULT 0,
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      estimated_duration TEXT,
      errors JSONB
    );

    -- Scraping queue
    CREATE TABLE scraping_queue (
      id BIGSERIAL PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Scraping logs
    CREATE TABLE scraping_logs (
      id BIGSERIAL PRIMARY KEY,
      status TEXT NOT NULL,
      response_time_ms INTEGER,
      scrape_duration_ms INTEGER,
      confidence_score FLOAT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Cost tracking
    CREATE TABLE scraping_costs (
      date DATE PRIMARY KEY,
      properties_scraped INTEGER DEFAULT 0,
      ai_requests INTEGER DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      estimated_cost DECIMAL(10,6) DEFAULT 0,
      details JSONB
    );

## 🔐 Environment Variables

Required environment variables:

  # Supabase
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  SUPABASE_ANON_KEY=your-anon-key

  # Claude/Anthropic
  ANTHROPIC_API_KEY=your-anthropic-api-key
  CLAUDE_MODEL=claude-3-haiku-20240307

  # System
  ENVIRONMENT=production
  ENABLE_COST_TRACKING=true

## 🚀 Deployment

### Manual Deployment

  # Navigate to project root
  cd /path/to/your/project

  # Deploy command station
  supabase functions deploy command-station --no-verify-jwt

  # Verify deployment
  curl "https://your-project.supabase.co/functions/v1/command-station/health"

### Automated Deployment

Create a deployment script:

    #!/bin/bash
    # deploy-command-station.sh

    echo "🚀 Deploying Command Station..."

    # Deploy function
    supabase functions deploy command-station --no-verify-jwt

    # Test deployment
    echo "🔍 Testing deployment..."
    HEALTH_CHECK=$(curl -s "https://your-project.supabase.co/functions/v1/command-station/health")

    if echo "$HEALTH_CHECK" | grep -q "healthy"; then
      echo "✅ Command Station deployed successfully!"
    else
      echo "❌ Deployment failed - health check failed"
      exit 1
    fi

    echo "📊 Getting system status..."
    curl "https://your-project.supabase.co/functions/v1/command-station/status" | jq '.'

    echo "🎯 Command Station is ready!"

## 🔍 Monitoring & Alerts

The Command Station provides built-in monitoring with configurable alerts:

### Alert Thresholds

- **Error Rate**: Warning at 10%, Critical at 25%
- **Daily Cost**: Warning at 80% of limit, Critical at 100%
- **Success Rate**: Warning below 85%, Critical below 70%
- **Queue Size**: Warning at 50 jobs, Critical at 100 jobs

### Health Checks

Regular health checks monitor:
- Database connectivity
- Worker function availability
- External API accessibility
- System resource usage

## 🛠️ Troubleshooting

### Common Issues

1. **Function not responding**

  # Check function logs
  supabase functions logs command-station

2. **Database connection errors**

  # Verify environment variables
  echo $SUPABASE_URL
  echo $SUPABASE_SERVICE_ROLE_KEY

3. **High error rates**

  # Check system status
  curl "https://your-project.supabase.co/functions/v1/command-station/status"

  # Get detailed metrics
  curl "https://your-project.supabase.co/functions/v1/command-station/metrics"

### Debug Mode

Enable detailed logging by setting environment variable:

  DEBUG=true

## 📈 Performance Optimization

### Best Practices

1. **Monitor regularly**: Check `/status` and `/metrics` endpoints
2. **Set appropriate limits**: Configure `dailyCostLimit` and `batchSize`
3. **Use cost optimization**: Enable `costOptimization` feature
4. **Monitor queue size**: Keep queue under 50 items for optimal performance

### Scaling Considerations

- Increase `maxConcurrentJobs` for higher throughput
- Adjust `batchSize` based on system performance
- Monitor database performance with large datasets
- Consider implementing caching for frequently accessed data

## 🤝 Integration

### With Existing Workers

The Command Station integrates with:
- `ai-scraper-worker`: AI processing and cost tracking
- `scraper-orchestrator`: Batch job coordination
- `scraper-worker`: Data collection and processing

### External Monitoring

Integrate with external monitoring tools:
- Export metrics to Grafana/Prometheus
- Send alerts to Slack/Discord
- Log to external logging services

## 📚 API Reference

For complete API documentation, visit:

  curl "https://your-project.supabase.co/functions/v1/command-station/help"

## 🔄 Updates & Maintenance

### Regular Maintenance

1. **Weekly**: Review cost trends and performance metrics
2. **Monthly**: Update configuration based on usage patterns
3. **Quarterly**: Review and update alert thresholds

### Version Updates

To update the Command Station:

1. Update the code

2. Redeploy: `supabase functions deploy command-station`

3. Test: `curl .../health`

4. Monitor: Check `/status` for any issues

---

## 🆘 Support


For issues or questions:

1. Check the logs: `supabase functions logs command-station`

2. Review system status: `GET /status`

3. Check health: `GET /health`

4. Review configuration: `GET /config`

The Command Station is designed to be self-monitoring and self-healing where possible. Most issues can be diagnosed through the built-in monitoring endpoints.

