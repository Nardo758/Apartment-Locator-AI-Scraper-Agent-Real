# 🔐 GitHub Secrets Setup Guide

This guide will help you configure the required GitHub secrets for successful Supabase deployment.

## 📋 Required Secrets

You need to set up the following secrets in your GitHub repository:

### 1. **SUPABASE_ACCESS_TOKEN**
- **What**: Your Supabase CLI access token
- **How to get**:
  1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
  2. Click your profile → "Access Tokens"
  3. Generate a new token with appropriate permissions
  4. Copy the token

### 2. **SUPABASE_PROJECT_ID** 
- **What**: Your Supabase project reference ID (used in URLs)
- **How to get**:
  1. Go to your project in [Supabase Dashboard](https://supabase.com/dashboard)
  2. Go to Settings → General
  3. Copy the "Reference ID" (usually looks like `abcdefghijklmnop`)
  4. **This is the same ID you see in your project URL**: `https://[this-id].supabase.co`
- **Example**: If your project URL is `https://abcdefghijklmnop.supabase.co`, then `SUPABASE_PROJECT_ID` should be `abcdefghijklmnop`

### 3. **SUPABASE_DB_PASSWORD**
- **What**: Your database password
- **How to get**:
  1. Go to your project in Supabase Dashboard
  2. Go to Settings → Database
  3. Copy the database password you set during project creation
  4. **If you forgot it**: You can reset it in the Database settings

### 4. **SUPABASE_ANON_KEY**
- **What**: Your project's anonymous/public API key
- **How to get**:
  1. Go to your project in Supabase Dashboard
  2. Go to Settings → API
  3. Copy the "anon/public" key

### 5. **SUPABASE_SERVICE_ROLE_KEY**
- **What**: Your project's service role key (admin access)
- **How to get**:
  1. Go to your project in Supabase Dashboard
  2. Go to Settings → API
  3. Copy the "service_role" key
  4. ⚠️ **Keep this secret** - it has admin access!

### 6. **ANTHROPIC_API_KEY**
- **What**: Your Claude AI API key
- **How to get**:
  1. Go to [Anthropic Console](https://console.anthropic.com/)
  2. Create an account or sign in
  3. Go to API Keys section
  4. Generate a new API key
  5. Copy the key (starts with `sk-ant-`)

## 🔧 How to Set GitHub Secrets

1. **Go to your GitHub repository**
2. **Click "Settings" tab**
3. **In the left sidebar, click "Secrets and variables" → "Actions"**
4. **Click "New repository secret"**
5. **Add each secret one by one:**

```
Name: SUPABASE_ACCESS_TOKEN
Value: [your access token]

Name: SUPABASE_PROJECT_ID  
Value: [your project ref ID]

Name: SUPABASE_DB_PASSWORD
Value: [your database password]

Name: SUPABASE_ANON_KEY
Value: [your anon key]

Name: SUPABASE_SERVICE_ROLE_KEY
Value: [your service role key]

Name: ANTHROPIC_API_KEY
Value: [your Claude API key]
```

## 🧪 Testing Your Setup

After setting up all secrets, you can test the deployment by:

1. **Manual trigger**: Go to Actions → "Deploy to Supabase" → "Run workflow"
2. **Push to main**: Any push to the main branch will trigger deployment
3. **Check logs**: Monitor the GitHub Actions logs for any authentication issues

## ❌ Common Issues & Solutions

### Issue: "password authentication failed"
**Solutions:**
1. **Verify SUPABASE_DB_PASSWORD** is correct
2. **Reset database password** in Supabase Dashboard if needed
3. **Check project ID** matches exactly

### Issue: "Invalid access token" 
**Solutions:**
1. **Regenerate access token** in Supabase Dashboard
2. **Update SUPABASE_ACCESS_TOKEN** secret
3. **Ensure token has proper permissions**

### Issue: "Project not found"
**Solutions:**
1. **Double-check SUPABASE_PROJECT_ID** (case-sensitive)
2. **Ensure project exists** and is accessible
3. **Verify access token permissions**

## 🔍 Debugging Tips

If deployment still fails:

1. **Check GitHub Actions logs** for specific error messages
2. **Test Supabase CLI locally**:
   ```bash
   supabase login --token [your-token]
   supabase link --project-ref [your-project-id] --password [your-password]
   ```
3. **Verify all secrets are set** (no typos in names)
4. **Ensure no trailing spaces** in secret values

## 📞 Getting Help

If you continue having issues:

1. **Check Supabase Status**: [status.supabase.com](https://status.supabase.com)
2. **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
3. **GitHub Actions Documentation**: [docs.github.com/actions](https://docs.github.com/en/actions)

---

## ✅ Verification Checklist

Before running deployment, ensure:

- [ ] All 6 secrets are set in GitHub repository
- [ ] SUPABASE_PROJECT_ID matches your project exactly
- [ ] SUPABASE_DB_PASSWORD is current and correct
- [ ] ANTHROPIC_API_KEY is valid and has credits
- [ ] Access token has necessary permissions
- [ ] Project is accessible and not paused

**Once all secrets are properly configured, your deployment should work successfully!** 🚀