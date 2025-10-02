# Phase 2: Rental Data Extraction Pilot

This directory contains the implementation for **Phase 2: Pilot Rental Data Extraction** of the Apartment Scraper AI Agent System.

## Overview

Phase 2 focuses on testing the Rental Data Agent's vision-based extraction capabilities on the top 10 high-priority properties discovered in Phase 1. This pilot establishes baseline performance metrics and validates the end-to-end rental data extraction pipeline.

## Files

- `phase2_pilot.py` - Main pilot execution script
- `rental_data_agent.py` - Vision-based rental data extraction agent
- `test_phase2_pilot.py` - Comprehensive test suite
- `.env.example` - Configuration template

## Quick Start

### 1. Ensure Phase 1 is Complete

Make sure Phase 1 has been run and properties are available:

```bash
# Run Phase 1 if not already completed
python agents/discovery_executor.py
```

### 2. Configure API Keys

The pilot requires OpenAI API access for vision analysis:

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Run the Pilot

Execute the rental data extraction pilot:

```bash
python agents/phase2_pilot.py
```

This will:
- Retrieve top 10 high-priority properties from Phase 1
- Extract detailed rental data using GPT-4V vision analysis
- Store rental units in the database
- Generate comprehensive performance metrics

## Configuration Options

Set these environment variables to customize behavior:

```bash
# OpenAI Vision Model
VISION_MODEL=gpt-4-vision-preview
VISION_MAX_TOKENS=2000

# Pilot Settings
PILOT_MAX_PROPERTIES=10  # Number of top properties to test

# Browser Automation
BROWSER_TIMEOUT=30000
PAGE_LOAD_TIMEOUT=10000
```

## Expected Output

When running with API keys configured:

```
🏠 Apartment Scraper - Phase 2: Rental Data Extraction Pilot
Testing vision-based rental extraction on top 10 high-priority properties
============================================================
🚀 Initializing Phase 2 Pilot Executor...
✅ Agents initialized successfully

🎯 Retrieving top 10 priority properties...
✅ Retrieved 10 high-priority properties

🏠 Starting Rental Data Extraction Pilot
🎯 Target: 10 properties
============================================================

🔍 Processing Property 1/10
   🏢 Luxury High-Rise Apartments
   ✅ Extraction successful

🔍 Processing Property 2/10
   🏢 Premium Downtown Lofts
   ✅ Extraction successful

📊 Pilot Results:
   ✅ Successful: 8
   ❌ Failed: 2
   📊 Success Rate: 80.0%
   ⏱️  Avg Processing Time: 12.3s
   🏠 Total Units: 245
```

## Demo Mode

If API keys are not configured, the system runs in demo mode and simulates the extraction process with realistic data patterns.

## Database Schema

Phase 2 populates the `rental_prices` table with:

- `property_id`: Links to properties_basic table
- `unit_type`: 1BR, 2BR, Studio, etc.
- `bedrooms`: Number of bedrooms
- `bathrooms`: Number of bathrooms
- `square_feet`: Unit size
- `monthly_rent`: Base rent amount
- `availability_date`: When unit becomes available
- `floor_plan_url`: Link to floor plan image
- `extracted_at`: Timestamp of extraction
- `extraction_method`: 'vision_pilot'

## Vision-Based Extraction

The pilot uses GPT-4V to analyze:

- **Floor Plan Images**: Extract unit layouts, sizes, and amenities
- **Pricing Tables**: Parse rent amounts and availability
- **Property Websites**: Navigate complex rental portals
- **Image Analysis**: OCR and visual understanding of rental information

### Extraction Capabilities

- Multi-page navigation for large properties
- Screenshot analysis for dynamic content
- Structured data extraction from complex layouts
- Error handling for various website formats

## Performance Metrics

The pilot tracks comprehensive metrics:

- **Success Rate**: Percentage of successful extractions
- **Processing Time**: Average time per property
- **Units Found**: Total rental units extracted
- **Error Patterns**: Common failure modes
- **Data Quality**: Completeness of extracted information

## Pilot Assessment

Based on pilot results, assess:

### Excellent Performance (≥80% success)
- Ready to scale to more properties
- Proceed to Phase 3 hybrid approach

### Good Performance (60-79% success)
- Consider optimizations for failed properties
- Review error patterns and website compatibility

### Needs Improvement (<60% success)
- Investigate extraction logic issues
- Consider fallback strategies
- Review vision model prompts and parameters

## Troubleshooting

### Common Issues

**"No properties found in database"**
- Ensure Phase 1 has been run successfully
- Check database connectivity and permissions

**Vision API rate limits exceeded**
- Reduce PILOT_MAX_PROPERTIES
- Add delays between extractions
- Consider batch processing

**Browser automation failures**
- Check playwright installation: `pip install playwright && playwright install`
- Verify website accessibility
- Review browser timeout settings

**Low extraction success rate**
- Review vision model prompts in rental_data_agent.py
- Check website complexity vs. agent capabilities
- Consider manual review of failed extractions

### Logs

Check `pilot.log` for detailed execution information and error messages.

## Next Steps

After Phase 2 completes:

1. **Review Results**: Analyze pilot performance metrics
2. **Data Validation**: Spot-check extracted rental data quality
3. **Phase 3**: Implement hybrid Claude + Vision routing
4. **Optimization**: Fine-tune based on pilot learnings

## Integration Points

Phase 2 integrates with:

- **Phase 1**: Consumes priority-ranked properties
- **Priority System**: Uses scoring for property selection
- **Database**: Stores rental data with proper relationships
- **Phase 3**: Provides baseline metrics for hybrid routing decisions