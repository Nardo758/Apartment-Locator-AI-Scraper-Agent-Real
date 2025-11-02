# Setup Production Supabase Configuration

## Production Credentials Needed

Your production Supabase project:
- **Project ID**: `jdymvpasjsdbryatscux`
- **URL**: `https://jdymvpasjsdbryatscux.supabase.co`
- **Service Role Key**: ❓ NEEDED

## How to Get Your Service Role Key

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard:
   ```
   https://supabase.com/dashboard/project/jdymvpasjsdbryatscux/settings/api
   ```

2. Look for **"Project API keys"** section

3. Find the **"service_role"** key (NOT the anon key)
   - It's a long JWT token starting with `eyJ...`
   - **⚠️ IMPORTANT**: This is a secret key, treat it like a password!

4. Copy the entire key

### Option 2: Check Your Environment

The key might already be in your environment. Check:

```powershell
# PowerShell
$env:SUPABASE_SERVICE_ROLE_KEY
```

```bash
# Bash/Linux
echo $SUPABASE_SERVICE_ROLE_KEY
```

## Update .env.production.real

Once you have the service role key, update the file:

```env
# Production credentials for running scraper
SUPABASE_URL=https://jdymvpasjsdbryatscux.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...YOUR_ACTUAL_KEY_HERE...

# API Keys
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
SERP_API_KEY=your-serp-api-key
```

## Test Connection

After updating, test the connection:

```bash
node test_production_connection.mjs
```

## Important Security Notes

1. **Never commit the real service role key to git**
   - ✅ The file is already in .gitignore
   - ✅ Git will ignore changes to it

2. **The service role key has full database access**
   - Can read, write, and delete all data
   - Only use it in secure environments

3. **If the key is compromised**
   - Rotate it immediately in Supabase dashboard
   - Update all scripts using the old key

## Next Steps

1. Get the service role key from Supabase dashboard
2. Update `.env.production.real` with the key
3. Run: `node test_production_connection.mjs`
4. If successful, run scraper to push data to production
