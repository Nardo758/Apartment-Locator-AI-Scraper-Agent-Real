# 🚀 GitHub Actions Setup Guide

## Overview

Your Apartment Locator AI Scraper now includes comprehensive GitHub Actions workflows for automated deployment and weekly scraping. The status badge in your README will show the current deployment status.

[![Deploy to Supabase](https://github.com/Nardo758/Apartment-Locator-AI-Scraper-Agent-Real/actions/workflows/deploy.yml/badge.svg)](https://github.com/Nardo758/Apartment-Locator-AI-Scraper-Agent-Real/actions/workflows/deploy.yml)

## 📁 Workflow Files

### 1. `deploy.yml` - Main Deployment Workflow
- **Triggers:** Push to main/master, pull requests, manual dispatch
- **Purpose:** Deploy database schema, Edge Functions, and validate system
- **Features:**
  - Automated testing and validation
  - Database migration deployment
  - Edge Function deployment with environment variables
  - Smoke tests and verification
  - Slack notifications on success/failure

### 2. `weekly-scraper.yml` - Scheduled Scraper
- **Triggers:** Weekly schedule (Sundays at midnight UTC), manual dispatch
- **Purpose:** Run enhanced scraper across multiple regions
- **Features:**
  - Cost limit checking before execution
  - Multi-region parallel processing (Atlanta, Austin, Dallas, Houston)
  - Dry-run capability for testing
  - Comprehensive reporting and notifications

## 🔧 Setup Instructions

### Step 1: Configure Repository Secrets

Navigate to your repository settings and add these secrets:

#### Required Secrets
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin privileges)
- `SUPABASE_ACCESS_TOKEN` - CLI access token
- `SUPABASE_DB_PASSWORD` - Database password
- `SUPABASE_PROJECT_ID` - Project reference ID
- `ANTHROPIC_API_KEY` - Claude API key for AI features

#### Optional Secrets
- `SLACK_WEBHOOK_URL` - For deployment and scraper notifications

### Step 2: Enable GitHub Actions

1. Go to your repository **Settings** → **Actions** → **General**
2. Ensure "Allow all actions and reusable workflows" is selected
3. Save changes

### Step 3: Test the Setup

1. **Manual Deployment Test:**
   - Go to **Actions** tab
   - Select "Deploy to Supabase"
   - Click "Run workflow"
   - Choose environment (production/staging)
   - Monitor the execution

2. **Weekly Scraper Test:**
   - Go to **Actions** tab
   - Select "Enhanced Weekly Scraper Scheduler"
   - Click "Run workflow"
   - Enable "dry_run" for safe testing
   - Choose target region or "all"

## 🎯 Workflow Features

### Deployment Workflow (`deploy.yml`)

#### Testing Phase
- **Deno Setup:** Installs Deno runtime and caches dependencies
- **Lint Checks:** Runs code linting and type checking
- **Unit Tests:** Executes test suite if available
- **Config Validation:** Validates deployment configuration files

#### Deployment Phase
- **Supabase CLI:** Sets up and links to your Supabase project
- **Database Migrations:** Applies schema changes and migrations
- **Edge Functions:** Deploys all functions with proper environment variables
- **Verification:** Runs smoke tests to ensure deployment success

#### Notification Phase
- **Success/Failure Alerts:** Sends notifications via Slack
- **Status Updates:** Updates deployment status and logs

### Weekly Scraper Workflow (`weekly-scraper.yml`)

#### Pre-flight Checks
- **Cost Limit Validation:** Checks daily spending limits before execution
- **System Health:** Verifies Supabase and Anthropic API connectivity
- **Configuration:** Validates scraper settings and parameters

#### Scraper Execution
- **Multi-region Processing:** Runs scraper across multiple cities in parallel
- **AI Enhancement:** Enables AI pricing and market intelligence
- **Frontend Sync:** Synchronizes data with frontend-ready format
- **Error Handling:** Graceful failure handling with detailed logging

#### Post-processing
- **Report Generation:** Creates detailed reports for each region
- **Summary Statistics:** Aggregates success/failure metrics
- **Notifications:** Sends comprehensive status updates

## 🔍 Monitoring and Debugging

### Viewing Workflow Logs
1. Go to **Actions** tab in your repository
2. Click on any workflow run
3. Expand job sections to view detailed logs
4. Download artifacts for detailed reports

### Common Issues and Solutions

#### ❌ "Invalid API Key" Errors
- Verify all secrets are correctly set
- Check for trailing spaces or special characters
- Ensure keys haven't been revoked

#### ❌ "Database Connection Failed"
- Verify `SUPABASE_URL` format: `https://project-id.supabase.co`
- Check if project is active (not paused)
- Verify service role key permissions

#### ❌ "Function Deployment Failed"
- Check if functions directory exists: `supabase/functions/`
- Verify function code syntax
- Check environment variable configuration

#### ❌ "Cost Limit Exceeded"
- Review Anthropic account balance
- Check daily cost limits in configuration
- Consider adjusting batch sizes

### Workflow Status Indicators

The status badge shows:
- 🟢 **Passing:** Latest deployment successful
- 🔴 **Failing:** Latest deployment failed
- 🟡 **Pending:** Deployment in progress
- ⚪ **No Status:** No recent deployments

## 📊 Performance Monitoring

### Key Metrics Tracked
- **Deployment Success Rate:** Percentage of successful deployments
- **Scraper Performance:** Properties processed per region
- **Cost Efficiency:** API usage and spending tracking
- **Error Rates:** Failed operations and their causes

### Optimization Tips
1. **Batch Size Tuning:** Adjust `BATCH_SIZE` based on performance
2. **Cost Management:** Monitor daily limits and usage patterns
3. **Regional Scheduling:** Stagger region processing to avoid rate limits
4. **Caching:** Leverage dependency caching for faster builds

## 🛠️ Customization

### Adding New Regions
Edit `weekly-scraper.yml` and update the region matrix:
```yaml
strategy:
  matrix:
    region: ["atlanta", "austin", "dallas", "houston", "new-city"]
```

### Adjusting Schedule
Modify the cron expression in `weekly-scraper.yml`:
```yaml
schedule:
  # Run every Sunday at midnight UTC
  - cron: '0 0 * * 0'
```

### Custom Notifications
Add additional notification channels by extending the notification jobs with your preferred services (Discord, Teams, Email, etc.).

## 🚀 Advanced Features

### Environment-Specific Deployments
The deployment workflow supports multiple environments:
- Production (default)
- Staging
- Development

### Force Run Options
The weekly scraper includes options to:
- Force run despite cost limits
- Run in dry-run mode for testing
- Target specific regions only

### Artifact Management
Both workflows generate and store:
- Deployment reports
- Scraper statistics
- Error logs
- Performance metrics

## 📞 Support

If you encounter issues:

1. **Check Workflow Logs:** Review the detailed execution logs
2. **Verify Secrets:** Ensure all required secrets are properly configured
3. **Test Locally:** Use the provided test scripts before deploying
4. **Monitor Costs:** Keep track of API usage and spending
5. **Review Documentation:** Check the comprehensive guides provided

## 🎉 Success Criteria

Your GitHub Actions setup is working correctly when:

- ✅ Deployment workflow completes without errors
- ✅ Weekly scraper processes all regions successfully
- ✅ Status badge shows "passing" status
- ✅ Notifications are received for important events
- ✅ Cost monitoring prevents budget overruns
- ✅ Database and functions are properly deployed
- ✅ AI features are working with accurate results

---

**🎯 Your apartment scraper is now fully automated!** The GitHub Actions workflows will handle deployment and weekly data collection, keeping your real estate data fresh and your system running smoothly.