# 🚨 Pre-Test Checklist for Real Integration Testing

## ✅ Essential Requirements

### 1. API Keys and Credentials
- [ ] **OpenAI API Key** - Valid and with sufficient credits
  - Get from: https://platform.openai.com/api-keys
  - Check balance: https://platform.openai.com/usage
  - Recommended minimum: $10 credit balance
  
- [ ] **Supabase URL and Service Role Key**
  - Get from: Supabase Dashboard → Settings → API
  - Test connection: `curl -H "apikey: YOUR_KEY" YOUR_URL/rest/v1/`
  
- [ ] **Environment File Setup**
  ```bash
  cp .env.local.template .env.local
  # Edit .env.local with your actual keys
  ```

### 2. System Requirements
- [ ] **Deno installed** (version 1.40+)
  ```bash
  deno --version
  ```
  
- [ ] **Supabase CLI installed**
  ```bash
  supabase --version
  ```
  
- [ ] **Internet connection** - Stable, high-speed recommended
  - Test: `ping -c 4 api.openai.com`
  - Test: `ping -c 4 supabase.com`

### 3. Database Setup
- [ ] **Supabase project is accessible**
- [ ] **Required tables exist**:
  - `apartments` table
  - `scraping_costs` table
- [ ] **RPC function exists**: `rpc_inc_scraping_costs`
- [ ] **Service role permissions** are properly configured

### 4. Local Development Environment
- [ ] **Function server can start**
  ```bash
  supabase functions serve ai-scraper-worker --env-file .env.local
  ```
  
- [ ] **Function responds to health check**
  ```bash
  curl http://localhost:54321/functions/v1/ai-scraper-worker
  ```

## 📊 Cost and Performance Planning

### Expected Test Costs
- **100 properties** × **~1,200 tokens/property** × **$0.035/1k tokens** = **~$4.20**
- **Safety buffer**: Budget $10-15 for the full test
- **Time estimate**: 15-30 minutes for complete test

### Rate Limiting Considerations
- **OpenAI Rate Limits**: 
  - GPT-4: 10,000 TPM (tokens per minute)
  - GPT-3.5: 90,000 TPM
- **Test batch size**: 5 properties per batch (recommended)
- **Delay between batches**: 1000ms (configurable)

### Performance Expectations
| Phase | Properties | Expected Behavior |
|-------|------------|-------------------|
| 1-10  | Warm-up | Slightly slower responses (3-5s each) |
| 11-50 | Optimal | Consistent performance (2-4s each) |
| 51-100| Sustained | Stable with potential rate limiting |

## 🔧 Pre-Test Validation Commands

Run these commands before starting the real test:

### 1. Environment Validation
```bash
# Check all required environment variables
deno run --allow-env --allow-read validate-environment.ts
```

### 2. Quick Function Test
```bash
# Test with a single property
deno run --allow-net --allow-env --allow-read test-single-property.ts
```

### 3. Cost Tracker Test
```bash
# Verify cost tracking works
deno run --allow-env test-cost-tracker.ts
```

### 4. Database Connectivity
```bash
# Test database connection
deno run --allow-net --allow-env test-database-connection.ts
```

## ⚠️ Important Warnings

### Cost Management
- [ ] **Set up cost alerts** in OpenAI dashboard
- [ ] **Monitor usage** during test execution
- [ ] **Have a kill switch ready** (Ctrl+C to stop)
- [ ] **Review pricing** before starting: https://openai.com/pricing

### Rate Limiting
- [ ] **Don't run multiple tests simultaneously**
- [ ] **Respect API rate limits**
- [ ] **Use recommended batch sizes**
- [ ] **Monitor for 429 (rate limit) errors**

### Data Privacy
- [ ] **Use test data only** (no real personal information)
- [ ] **Review generated HTML** for sensitive content
- [ ] **Clean up test data** after completion

## 🎯 Execution Steps

### Step 1: Final Environment Check
```bash
cd /workspace/supabase/functions/ai-scraper-worker
deno run --allow-env --allow-read validate-environment.ts
```

### Step 2: Start Function Server
```bash
# Terminal 1: Start the server
supabase functions serve ai-scraper-worker --env-file .env.local

# Terminal 2: Verify it's running
curl http://localhost:54321/functions/v1/ai-scraper-worker
```

### Step 3: Run Enhanced Test
```bash
# Terminal 2: Run the comprehensive test
deno run --allow-net --allow-env --allow-read test-ai-scraper-enhanced.ts
```

### Step 4: Monitor Progress
- Watch console output for success/failure rates
- Monitor cost accumulation if enabled
- Check for any error patterns
- Note performance metrics

### Step 5: Review Results
- Analyze final test report
- Review cost breakdown
- Check database for saved data
- Identify any issues for optimization

## 🚨 Emergency Procedures

### If Costs Escalate
1. **Immediately stop** the test (Ctrl+C)
2. **Check OpenAI usage** dashboard
3. **Review cost tracking** output
4. **Adjust batch size** or delays if continuing

### If Errors Spike
1. **Pause test execution**
2. **Check error patterns** in console
3. **Verify API keys** are still valid
4. **Check rate limiting** status
5. **Restart with smaller batch size**

### If Performance Degrades
1. **Monitor network connectivity**
2. **Check Supabase service status**
3. **Verify OpenAI API status**
4. **Reduce concurrent requests**

## 📈 Success Criteria

### Minimum Acceptable Performance
- [ ] **Success rate ≥ 90%** for property extraction
- [ ] **Average response time ≤ 5 seconds**
- [ ] **Cost per property ≤ $0.05**
- [ ] **No critical errors** (500 status codes)

### Optimal Performance Targets
- [ ] **Success rate ≥ 95%**
- [ ] **Average response time ≤ 3 seconds**
- [ ] **Cost per property ≤ $0.03**
- [ ] **Zero timeout errors**

## 📝 Post-Test Actions

### Immediate Cleanup
- [ ] **Stop function server** (Ctrl+C)
- [ ] **Review cost dashboard**
- [ ] **Save test results** to file
- [ ] **Clean up test database entries** (if desired)

### Analysis and Documentation
- [ ] **Analyze performance patterns**
- [ ] **Document any issues found**
- [ ] **Update configurations** based on results
- [ ] **Plan production deployment** parameters

### Cost Reconciliation
- [ ] **Compare estimated vs actual costs**
- [ ] **Update cost models** if necessary
- [ ] **Set production budget alerts**
- [ ] **Plan scaling considerations**

---

## ✨ Ready to Test?

Once all checklist items are complete, you're ready to run the real integration test!

**Final command to execute:**
```bash
deno run --allow-net --allow-env --allow-read test-ai-scraper-enhanced.ts
```

**Expected duration:** 15-30 minutes  
**Expected cost:** $4-8  
**Expected success rate:** 95%+  

Good luck! 🚀