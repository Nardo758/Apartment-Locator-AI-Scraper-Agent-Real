# Claude + SERP API Integration Guide

## Overview

The `claude-queue-builder` function now integrates **SERP API** for property discovery and **Claude AI** for intelligent analysis. This creates a powerful automated property discovery and queueing system.

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Request   │────▶│   SERP API   │────▶│   Claude AI  │────▶│   Database   │
│ (Query +    │     │  (Search)    │     │  (Analysis)  │     │  (Persist)   │
│  Location)  │     │              │     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Step 1: SERP API Search
- Searches Google for apartment properties
- Returns organic search results with URLs, titles, and snippets
- Configurable number of results (default: 10)

### Step 2: Claude AI Analysis
For each property found, Claude analyzes:
- **Confidence Score** (0-1): Likelihood it's a legitimate apartment property
- **Website Complexity**: simple, medium, or complex
- **Priority Level**: low, medium, or high
- **Website Type**: jonah, yardi_rent_cafe, entrada, realpage, mixed_media, other, unknown
- **Property Name**: Extracted from listing

### Step 3: Database Persistence
- Stores property discovery data
- Queues properties for scraping
- Maintains metadata for tracking

## Setup

### 1. Get SERP API Key

1. Go to [https://serpapi.com/](https://serpapi.com/)
2. Sign up for an account (free tier available)
3. Copy your API key from the dashboard

### 2. Add to Environment Variables

Add to your `.env` file:

```bash
# SERP API Configuration
SERP_API_KEY=your-serp-api-key-here

# Claude AI Configuration (if not already set)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 3. Configure Supabase Secrets

For production deployment, add secrets to Supabase:

```bash
supabase secrets set SERP_API_KEY=your-serp-api-key-here
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

## Usage

### Via Control Panel

```bash
# Run the queue builder
node control-panel.mjs run-now claude-queue-builder
```

### Via Direct API Call

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/claude-queue-builder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "luxury apartments for rent",
    "location": "Atlanta, GA",
    "num_results": 10,
    "use_claude": true
  }'
```

### Via Test Script

```bash
# Default query (Atlanta)
node test_claude_queue_with_serp.mjs

# Custom query
node test_claude_queue_with_serp.mjs "luxury apartments" "New York, NY"

# Custom with number of results
node test_claude_queue_with_serp.mjs "apartments" "Miami, FL" 20
```

## Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | "luxury apartments for rent" | Search query |
| `location` | string | "Atlanta, GA" | Geographic location |
| `num_results` | number | 10 | Maximum results from SERP |
| `use_claude` | boolean | true | Enable Claude analysis |
| `test_mode` | boolean | false | Return mock data for testing |

## Response Format

```json
{
  "status": "ok",
  "source": "claude-queue-builder",
  "search": {
    "query": "luxury apartments for rent",
    "location": "Atlanta, GA",
    "numResults": 10
  },
  "analyzed": 10,
  "persisted": [
    {
      "url": "https://example.com",
      "status": "enqueued_via_rpc",
      "rpc": { ... }
    }
  ],
  "debug": {
    "serp_api_configured": true,
    "claude_configured": true,
    "claude_used": true
  }
}
```

## Cost Considerations

### SERP API
- Free tier: 100 searches/month
- Paid: Starting at $50/month for 5,000 searches
- Each queue builder run = 1 search

### Claude AI
- Approximately $0.003 per property analyzed (with Sonnet 3.5)
- 10 properties ≈ $0.03
- 100 properties ≈ $0.30
- 1000 properties ≈ $3.00

### Recommended Schedule

**Budget-Conscious** (Weekly):
```bash
node control-panel.mjs schedule claude-queue-builder "0 1 * * 0"
```
- Weekly execution
- ~4 searches/month (well within free tier)

**Balanced** (Daily):
```bash
node control-panel.mjs schedule claude-queue-builder "0 1 * * *"
```
- Daily execution
- ~30 searches/month
- Captures fresh listings

**Aggressive** (Multiple times daily):
```bash
node control-panel.mjs schedule claude-queue-builder "0 1,13 * * *"
```
- Twice daily
- ~60 searches/month
- Maximum coverage

## Fallback Behavior

If Claude AI is unavailable or disabled:
- Falls back to rule-based detection
- Uses pattern matching for website type
- Calculates confidence based on snippet keywords
- Still functional, just less intelligent

## Troubleshooting

### "SERP_API_KEY not configured"

**Solution:**
1. Check `.env` file has `SERP_API_KEY=...`
2. Restart Supabase functions: `supabase functions serve`
3. For production: `supabase secrets set SERP_API_KEY=your-key`

### "Claude analysis failed"

**Solution:**
- Check `ANTHROPIC_API_KEY` is set correctly
- Verify you have API credits remaining
- Function will use fallback rule-based detection
- Set `use_claude: false` to disable Claude entirely

### No results returned

**Possible causes:**
1. SERP API quota exceeded (check serpapi.com dashboard)
2. Invalid location format (use "City, State" format)
3. Query too specific or misspelled

### Properties not appearing in database

**Check:**
1. Database RPC functions exist: `upsert_property_discovery_and_source`
2. Service role key has correct permissions
3. Check response `persisted` array for error messages

## Integration with Scraper Workflow

```
1. Claude Queue Builder (Discovery)
   ├─▶ SERP API: Find properties
   ├─▶ Claude AI: Analyze quality
   └─▶ Database: Store & queue

2. Scraper Orchestrator (Coordination)
   └─▶ Picks up queued properties

3. AI Scraper Worker (Extraction)
   └─▶ Scrapes property details

4. Database (Storage)
   └─▶ Stores scraped data
```

## Best Practices

1. **Start Small**: Test with 5-10 properties first
2. **Monitor Costs**: Track SERP and Claude usage
3. **Use Scheduling**: Automate with control panel
4. **Check Quality**: Review confidence scores regularly
5. **Adjust Queries**: Refine search terms based on results

## Example Queries

### General Searches
```json
{
  "query": "apartments for rent",
  "location": "Atlanta, GA"
}
```

### Luxury Properties
```json
{
  "query": "luxury apartments high rise",
  "location": "New York, NY"
}
```

### Specific Areas
```json
{
  "query": "apartments downtown midtown",
  "location": "Chicago, IL"
}
```

### Student Housing
```json
{
  "query": "student apartments near campus",
  "location": "Austin, TX"
}
```

## Advanced Configuration

### Disable Claude (Rule-based only)
```json
{
  "query": "apartments",
  "location": "Atlanta, GA",
  "use_claude": false
}
```

### Test Mode (No API calls)
```json
{
  "test_mode": true
}
```

## Monitoring

Check queue builder status:
```bash
node control-panel.mjs status
```

View function logs:
```bash
supabase functions logs claude-queue-builder --limit 50
```

## Summary

The Claude + SERP integration provides:
- ✅ Automated property discovery
- ✅ Intelligent quality assessment
- ✅ Scalable search capabilities
- ✅ Cost-effective operation
- ✅ Flexible configuration
- ✅ Production-ready reliability

Start discovering properties automatically! 🚀
