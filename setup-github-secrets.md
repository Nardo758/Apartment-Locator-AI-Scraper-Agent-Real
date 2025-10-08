# 🔐 GitHub Repository Secrets Setup

## Step-by-Step Guide

### 1. Navigate to Repository Settings

1. Go to: `https://github.com/Nardo758/Apartment-Locator-AI-Scraper-Agent-Real`
2. Click the **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### 2. Add Required Secrets

Click **New repository secret** for each of the following:

#### ✅ Required Secrets Checklist

**Database Connection Secrets:**

- [ ] **SUPABASE_URL**
  - Value: `https://your-project-id.supabase.co`
  - Find: Supabase Dashboard → Project Settings → API → Project URL

- [ ] **SUPABASE_ANON_KEY**
  - Value: Your anon/public API key
  - Find: Supabase Dashboard → Project Settings → API → Project API keys → anon
    public

- [ ] **SUPABASE_SERVICE_ROLE_KEY**
  - Value: Your service role key (⚠️ Admin privileges - keep secure!)
  - Find: Supabase Dashboard → Project Settings → API → Project API keys →
    service_role

**Deployment Secrets:**

- [ ] **SUPABASE_ACCESS_TOKEN**
  - Value: Your Supabase CLI access token
  - Find: Run `supabase login` locally or Supabase Dashboard → Account → Access
    Tokens

- [ ] **SUPABASE_DB_PASSWORD**
  - Value: Your database password
  - Find: Supabase Dashboard → Settings → Database → Connection string (extract
    password)

- [ ] **SUPABASE_PROJECT_ID**
  - Value: Your project reference ID (not the full URL)
  - Find: Supabase Dashboard → Project Settings → General → Reference ID

**AI Integration:**

- [ ] **ANTHROPIC_API_KEY**
  - Value: Your Claude API key
  - Find: [Anthropic Console](https://console.anthropic.com/) → API Keys
  - ⚠️ Make sure your account has sufficient credits

**Optional Notifications:**

- [ ] **SLACK_WEBHOOK_URL** (Optional but recommended)
  - Value: Your Slack webhook URL for deployment notifications
  - Find: Slack → Apps → Incoming Webhooks

## 3. Verification Steps

After adding all secrets:

1. **Check Secret Names:** Ensure exact spelling (case-sensitive)
2. **Verify Values:** No trailing spaces or extra characters
3. **Test Access:** Keys should have appropriate permissions

## 4. Quick Test Commands

You can test your secrets locally (if you have them as environment variables):

```bash
# Test Supabase connection
curl -f "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY"

# Test Anthropic API (replace with your key)
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

## 5. Security Best Practices

✅ **Do:**

- Use repository secrets (not environment variables in workflow files)
- Regularly rotate API keys
- Monitor usage and costs
- Enable two-factor authentication

❌ **Don't:**

- Commit secrets to code
- Share service role keys
- Store secrets in workflow files
- Give excessive permissions

## 6. Common Issues

**"Invalid API Key" Errors:**

- Verify key is copied correctly
- Check for extra spaces/characters
- Ensure key hasn't been revoked

**"Database Connection Failed":**

- Verify SUPABASE_URL format
- Check service role key permissions
- Confirm project isn't paused

**"Cost Limit Exceeded":**

- Check Anthropic account balance
- Review daily limits in deploy-control.json
- Monitor usage in Anthropic Console

## 7. Next Steps

Once all secrets are configured:

1. ✅ Push your changes to the main branch
2. ✅ Go to Actions tab and watch the deployment workflow run
3. ✅ Check your status badge - it should show "passing" ✅
4. ✅ Test the weekly scraper workflow manually

---

**🎉 Ready to deploy!** Once these secrets are configured, your GitHub Actions
workflows will be fully operational.
