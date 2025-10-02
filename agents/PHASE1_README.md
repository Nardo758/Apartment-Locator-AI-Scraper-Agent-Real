# Property Discovery Phase 1

This directory contains the implementation for **Phase 1: Property Discovery** of the Apartment Scraper AI Agent System.

## Overview

Phase 1 focuses on building an initial database of apartment properties using the Property Discovery Agent. This agent discovers apartment communities, extracts basic property information, and stores it in the database with priority scoring.

## Files

- `discovery_executor.py` - Main execution script for Phase 1
- `property_discovery_agent.py` - Property Discovery Agent implementation
- `priority_system.py` - Priority scoring system
- `.env.example` - Configuration template

## Quick Start

### 1. Configure API Keys

Copy the environment template and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual API keys:
- **SERP_API_KEY**: For property URL discovery
- **ANTHROPIC_API_KEY**: For Claude AI property extraction
- **SUPABASE_URL** & **SUPABASE_SERVICE_ROLE_KEY**: For database operations

### 2. Run Property Discovery

Execute the discovery pipeline:

```bash
python discovery_executor.py
```

This will:
- Discover 100-200 apartment properties in Atlanta, GA
- Extract basic property information using Claude
- Store properties in the database
- Calculate priority scores for each property

## Configuration Options

Set these environment variables to customize behavior:

```bash
# Target location and property count
DISCOVERY_LOCATION="Atlanta, GA"
DISCOVERY_MAX_PROPERTIES=200

# Claude model settings
CLAUDE_MODEL="claude-3-haiku-20240307"
CLAUDE_MAX_TOKENS=1000

# Logging
LOG_LEVEL=INFO
```

## Expected Output

When running with API keys configured:

```
🏢 Apartment Scraper - Property Discovery Phase 1
Building initial database of apartment properties
============================================================
🚀 Initializing Property Discovery Executor...
✅ Agents initialized successfully

🏙️  Starting Property Discovery for Atlanta, GA
🎯 Target: 200 properties
============================================================

🔑 Checking API Key Configuration...
✅ All API keys configured

🔍 Running Property Discovery Agent...

📊 Discovery Results:
   🏢 Properties Found: 187
   💾 Properties Stored: 175
   ⏱️  Duration: 45.2s
   📅 Completed: 2025-10-01T18:30:00.000Z

🎯 Updating Property Priorities...
   ✅ Updated priorities for 175 properties

================================================================================
📋 PROPERTY DISCOVERY EXECUTION SUMMARY
================================================================================
🏙️  Location: Atlanta, GA
🎯 Target Properties: 200
🏢 Properties Discovered: 187
💾 Properties Stored: 175
   ⏱️  Duration: 45.2s
🔑 API Keys: ✅ Configured
📅 Completed: 2025-10-01T18:30:00.000Z

💡 Next Steps:
   1. Review discovered properties in database
   2. Run Phase 2: Pilot rental data extraction
   3. Implement hybrid agent routing
================================================================================
```

## Demo Mode

If API keys are not configured, the system runs in demo mode and simulates the discovery process with sample data.

## Database Schema

Phase 1 populates the `properties_basic` table with:

- `property_name`: Apartment community name
- `property_url`: Website URL
- `year_built`: Construction year
- `total_units`: Number of apartment units
- `property_type`: luxury/standard/student/etc.
- `management_company`: Property management company
- `city`, `state`: Location information
- `confidence_score`: AI extraction confidence
- `website_complexity`: simple/medium/complex
- `priority_score`: Calculated priority (0.0-1.0)
- `priority_level`: high/medium/low

## Priority Scoring

Properties are automatically scored based on:

- **Unit Count**: More units = higher priority
- **Property Type**: Luxury > Standard > Other
- **Management Company**: Known companies > Unknown
- **Complexity**: Medium complexity > Simple/Complex
- **Location**: Atlanta metro area prioritized

## Next Steps

After Phase 1 completes:

1. **Review Results**: Check discovered properties in Supabase dashboard
2. **Phase 2**: Run rental data extraction on top 10 high-priority properties
3. **Phase 3**: Implement hybrid agent routing for optimal performance

## Troubleshooting

### Common Issues

**"Agents initialized successfully" but discovery fails:**
- Check API keys are correctly set in `.env`
- Verify Supabase connection and table permissions

**Low property discovery count:**
- SERP API rate limits or quota exceeded
- Try different search queries or reduce DISCOVERY_MAX_PROPERTIES

**Priority scores not updating:**
- Check database permissions for priority_system
- Verify properties_basic table has correct schema

### Logs

Check `discovery.log` for detailed execution information and error messages.