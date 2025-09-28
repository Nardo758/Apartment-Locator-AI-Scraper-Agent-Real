# 🔐 GitHub Actions Secrets Setup Guide

## Overview
To enable automated weekly scraping via GitHub Actions, you need to configure repository secrets that contain your sensitive environment variables.

## 🚀 Quick Setup

### Step 1: Navigate to Repository Settings
1. Go to your GitHub repository: `https://github.com/Nardo758/Apartment-Locator-AI-Scraper-Agent-Real`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Required Secrets
Click **New repository secret** for each of the following:

#### 🗄️ **SUPABASE_URL** (Required)
- **Name:** `SUPABASE_URL`
- **Value:** `https://your-project-id.supabase.co`
- **Where to find:** Supabase Dashboard → Project Settings → API

#### 🔑 **SUPABASE_ANON_KEY** (Required)
- **Name:** `SUPABASE_ANON_KEY`
- **Value:** Your anon/public key from Supabase
- **Where to find:** Supabase Dashboard → Project Settings → API

#### 🔐 **SUPABASE_SERVICE_ROLE_KEY** (Required)
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Your service role key from Supabase
- **Where to find:** Supabase Dashboard → Project Settings → API
- **⚠️ Warning:** This key has admin privileges - keep it secure!

#### 🤖 **ANTHROPIC_API_KEY** (Required)
- **Name:** `ANTHROPIC_API_KEY`
- **Value:** Your Claude API key
- **Where to find:** [Anthropic Console](https://console.anthropic.com/) → API Keys

#### 📢 **SLACK_WEBHOOK_URL** (Optional)
- **Name:** `SLACK_WEBHOOK_URL`
- **Value:** Your Slack webhook URL for notifications
- **Where to find:** Slack → Apps → Incoming Webhooks

## 🔍 How to Find Your Keys

### Supabase Keys
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the values:
   - **URL:** Project URL
   - **anon public:** SUPABASE_ANON_KEY
   - **service_role:** SUPABASE_SERVICE_ROLE_KEY

### Anthropic API Key
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign in to your account
3. Navigate to **API Keys**
4. Create a new key or copy existing key
5. **Note:** You need credits in your Anthropic account for the scraper to work

### Slack Webhook (Optional)
1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Create a new webhook for your desired channel
4. Copy the webhook URL

## 🧪 Testing Secrets

After adding secrets, you can test them by:

1. **Manual Workflow Trigger:**
   - Go to **Actions** tab in your repository
   - Find "Enhanced Weekly Scraper Scheduler"
   - Click **Run workflow** → **Run workflow**

2. **Check Workflow Logs:**
   - Monitor the workflow execution
   - Check for authentication errors
   - Verify cost monitoring works

## 📋 Complete Secrets Checklist

```
Required Secrets:
□ SUPABASE_URL
□ SUPABASE_ANON_KEY  
□ SUPABASE_SERVICE_ROLE_KEY
□ ANTHROPIC_API_KEY

Optional Secrets:
□ SLACK_WEBHOOK_URL (for notifications)
```

## 🔧 Advanced Configuration

### Environment-Specific Secrets
If you have multiple environments, you can create environment-specific secrets:

- `SUPABASE_URL_PROD`
- `SUPABASE_URL_STAGING`
- `ANTHROPIC_API_KEY_PROD`

Then modify the workflow to use the appropriate secrets based on branch or manual input.

### Cost Control Secrets
For additional cost control, you can add:

- `MAX_DAILY_COST` - Override default daily limit
- `ALERT_EMAIL` - Email for cost alerts
- `EMERGENCY_STOP_WEBHOOK` - Webhook to call if costs exceed limits

## 🚨 Security Best Practices

### ✅ Do:
- Use repository secrets (not environment variables in workflow files)
- Regularly rotate your API keys
- Monitor usage and costs
- Use least-privilege principles
- Enable two-factor authentication on all accounts

### ❌ Don't:
- Commit API keys to code
- Share service role keys
- Use personal API keys for production
- Store secrets in workflow files
- Give excessive permissions

## 🔄 Workflow Behavior

Once secrets are configured, the GitHub Actions workflow will:

1. **Weekly Schedule:** Run every Sunday at midnight UTC
2. **Cost Monitoring:** Check daily limits before running
3. **Regional Processing:** Process different regions in parallel
4. **Error Handling:** Auto-pause on repeated failures
5. **Notifications:** Send alerts via Slack (if configured)

## 🛠️ Troubleshooting

### Common Issues:

#### "Invalid API Key" Errors
- Verify the API key is copied correctly
- Check if the key has been revoked
- Ensure no extra spaces or characters

#### "Database Connection Failed"
- Verify SUPABASE_URL format: `https://project-id.supabase.co`
- Check if service role key has proper permissions
- Confirm project is not paused

#### "Cost Limit Exceeded"
- Check your Anthropic account balance
- Review daily cost limits in `deploy-control.json`
- Monitor usage in Anthropic Console

#### Workflow Not Running
- Verify secrets are named exactly as shown above
- Check workflow file syntax
- Ensure repository has Actions enabled

## 📞 Getting Help

If you encounter issues:

1. **Check Workflow Logs:** Go to Actions → Latest run → View logs
2. **Verify Secrets:** Ensure all required secrets are set
3. **Test Locally:** Use `./test-enhanced-system.sh`
4. **Check Service Status:** Verify Supabase and Anthropic are operational

## 🎉 Success Indicators

You'll know the setup is working when:

- ✅ Workflow runs without authentication errors
- ✅ Database connections succeed
- ✅ Claude API calls work
- ✅ Cost monitoring functions properly
- ✅ Properties are successfully scraped and analyzed

---

**Next Step:** After configuring secrets, test the system with:
```bash
./test-enhanced-system.sh
./deploy-scraper.sh
```