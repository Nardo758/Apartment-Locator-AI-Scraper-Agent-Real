# AI Scraper Worker - Testing Guide

This document provides comprehensive instructions for testing the `ai-scraper-worker` Supabase Edge Function.

## 📁 Function Structure

The `ai-scraper-worker` is a Supabase Edge Function that:
- Uses Deno's `serve()` function (not a traditional named export)
- Processes apartment listing HTML via OpenAI
- Validates extracted data
- Saves results to Supabase database
- Tracks usage costs

## 🔍 Code Analysis Results

### Main Export Function
- **Type**: Supabase Edge Function using `serve()`
- **Entry Point**: Anonymous async function `serve(async (req: Request) => { ... })`
- **Location**: Line 32 in `index.ts`

### Key Dependencies
- `std/http/server.ts` - Deno HTTP server
- `@supabase/supabase-js` - Database client
- `../openai_config.ts` - AI model configuration

### Function Flow
1. Accepts POST requests with apartment HTML data
2. Calls OpenAI API for data extraction
3. Validates extracted apartment data
4. Saves to Supabase `apartments` table
5. Records usage costs in `scraping_costs` table

## 🧪 Testing Options

### 1. Validation Unit Tests (Fastest)

Test the validation logic directly without external dependencies:

```bash
cd /workspace/supabase/functions/ai-scraper-worker
deno run --allow-read test-validation.ts
```

**What it tests:**
- Required field validation
- Price range validation (0-50,000)
- State code validation (2-letter format)
- Bedroom/bathroom count validation (0-10)

### 2. Full Integration Tests (Comprehensive)

Test the complete function via HTTP requests:

```bash
# 1. Start Supabase locally (if not already running)
supabase start

# 2. Start the function server
supabase functions serve ai-scraper-worker --env-file .env.local

# 3. In another terminal, run the test
cd /workspace/supabase/functions/ai-scraper-worker
deno run --allow-net --allow-env --allow-read test-ai-scraper.ts
```

**What it tests:**
- Complete HTTP request/response cycle
- OpenAI API integration
- Database saving functionality
- Cost tracking
- Error handling
- 100 different property variations

## ⚙️ Environment Setup

### Required Environment Variables

Create `.env.local` in your project root:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration  
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Optional: Database URL for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Supabase Setup

Ensure your Supabase project has these tables:
- `apartments` - For storing scraped apartment data
- `scraping_costs` - For tracking API usage costs

Required RPC function:
- `rpc_inc_scraping_costs` - For cost aggregation

## 🚀 Quick Start Testing

### Option A: Quick Validation Test (30 seconds)
```bash
cd /workspace/supabase/functions/ai-scraper-worker
deno run test-validation.ts
```

### Option B: Full Function Test (5-10 minutes)
```bash
# Terminal 1: Start function server
supabase functions serve ai-scraper-worker --env-file .env.local

# Terminal 2: Run integration tests  
cd /workspace/supabase/functions/ai-scraper-worker
deno run --allow-net --allow-env --allow-read test-ai-scraper.ts
```

## 📊 Test Results Interpretation

### Validation Tests
- **All Pass**: Validation logic is working correctly
- **Some Fail**: Check validation criteria in `validateAiResult()`

### Integration Tests
- **Success Rate >95%**: Function is working well
- **Success Rate 80-95%**: Some data quality issues, review HTML templates
- **Success Rate <80%**: Check OpenAI API key, model availability, or network issues

### Common Issues
- **HTTP 500**: Missing environment variables
- **HTTP 422**: AI returned invalid JSON or failed validation
- **HTTP 400**: Invalid request format
- **Connection refused**: Function server not running

## 🔧 Customizing Tests

### Modify Test Data
Edit `generateTestProperties()` in `test-ai-scraper.ts`:
- Change HTML templates
- Adjust property variations
- Modify test batch size

### Add New Validation Rules
Edit `validateAiResult()` in both files:
- Add new required fields
- Modify validation criteria
- Update test cases accordingly

## 📈 Performance Monitoring

The integration test provides:
- **Token Usage**: Prompt/completion token counts
- **Cost Estimation**: Based on model pricing
- **Success Rates**: Per batch and overall
- **Error Analysis**: Detailed error reporting

## 🐛 Troubleshooting

### Function Won't Start
```bash
# Check Supabase CLI version
supabase --version

# Restart Supabase
supabase stop
supabase start
```

### OpenAI API Errors
- Verify API key is valid and has credits
- Check model availability (`gpt-4-turbo-preview`)
- Monitor rate limits

### Database Errors
- Ensure tables exist in Supabase
- Check RPC function is deployed
- Verify service role key permissions

### Test Script Errors
```bash
# Update Deno
deno upgrade

# Clear cache
deno cache --reload test-ai-scraper.ts
```

## 📝 Next Steps

After testing:
1. Review success rates and optimize HTML templates
2. Adjust validation rules based on real data
3. Monitor costs and optimize model selection
4. Set up automated testing in CI/CD pipeline
5. Deploy to production environment

## 🤝 Contributing

When adding new tests:
1. Follow existing test patterns
2. Add both positive and negative test cases
3. Update this README with new testing procedures
4. Ensure tests are deterministic and reliable