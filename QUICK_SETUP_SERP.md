# Quick Setup: SERP API + Claude Integration

## ✅ What Was Done

The `claude-queue-builder` now integrates with SERP API and Claude AI for intelligent property discovery:

```
Search (SERP) → Analyze (Claude) → Store (Database) → Queue (Scraper)
```

## 🚀 Quick Start (3 Steps)

### 1. Get SERP API Key

1. Go to **https://serpapi.com/**
2. Sign up (free tier: 100 searches/month)
3. Copy your API key

### 2. Add to .env File

```bash
# Add this to your .env file
SERP_API_KEY=your-actual-serp-api-key-here
ANTHROPIC_API_KEY=your-actual-claude-api-key-here  # If not already set
```

### 3. Test It

```bash
# Test with default query (Atlanta)
node test_claude_queue_with_serp.mjs

# Or test with custom location
node test_claude_queue_with_serp.mjs "luxury apartments" "New York, NY"
```

## 📖 Full Documentation

See **docs/CLAUDE_SERP_INTEGRATION.md** for:
- Detailed setup instructions
- API cost breakdown
- Scheduling recommendations
- Troubleshooting guide
- Advanced configuration

## 🎛️ Using with Control Panel

```bash
# Enable the queue builder
node control-panel.mjs enable claude-queue-builder

# Set weekly schedule (Sunday 1 AM)
node control-panel.mjs schedule claude-queue-builder "0 1 * * 0"

# Run it now
node control-panel.mjs run-now claude-queue-builder

# Check status
node control-panel.mjs status
```

## 💡 What It Does

1. **Searches Google** for apartment properties via SERP API
2. **Analyzes with Claude** for quality, confidence, and priority
3. **Detects website types** (Yardi, RentCafe, Entrada, etc.)
4. **Stores discoveries** in your database
5. **Queues for scraping** automatically

## 💰 Cost

- **SERP API**: Free tier = 100 searches/month
- **Claude AI**: ~$0.03 per 10 properties analyzed
- **Weekly schedule**: ~4 searches/month (free!)
- **Daily schedule**: ~30 searches/month (free!)

## ❓ Need Help?

1. Check **docs/CLAUDE_SERP_INTEGRATION.md**
2. Run test script to verify setup
3. Check function logs: `supabase functions logs claude-queue-builder`

## 🎉 You're Ready!

The queue builder is now AI-powered and will automatically discover apartment properties for scraping!
