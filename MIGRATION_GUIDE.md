# 🗄️ Database Migration Guide

## Overview
This guide helps you run the database migrations to set up the enhanced property scraper system schema.

## 🚀 Quick Migration (Recommended)

### Option 1: Using Supabase CLI (Local/Production)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Linux/WSL
   curl -fsSL https://get.supabase.com | sh
   
   # Windows
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. **Run migrations**:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard (Web Interface)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Run each migration file in order:

#### Migration 1: Security Hardening
Copy and run the contents of `supabase/migrations/20250928000000_security_hardening_rls.sql`

#### Migration 2: Property Sources System
Copy and run the contents of `supabase/migrations/20250928001000_create_property_sources_system.sql`

#### Migration 3: Cost Monitoring Functions
Copy and run the contents of `supabase/migrations/20250928002000_add_cost_monitoring_functions.sql`

#### Migration 4: URL Migration
Copy and run the contents of `supabase/migrations/20250928003000_migrate_existing_urls.sql`

### Option 3: Using psql (Direct Database Connection)

1. **Get connection string** from Supabase Dashboard → Settings → Database
2. **Connect to database**:
   ```bash
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
   ```
3. **Run each migration file**:
   ```bash
   \i supabase/migrations/20250928000000_security_hardening_rls.sql
   \i supabase/migrations/20250928001000_create_property_sources_system.sql
   \i supabase/migrations/20250928002000_add_cost_monitoring_functions.sql
   \i supabase/migrations/20250928003000_migrate_existing_urls.sql
   ```

## 📋 Migration Files Overview

### 1. Security Hardening (20250928000000)
**Purpose:** Enable Row Level Security (RLS) on all tables and secure functions
**What it does:**
- Enables RLS on 10+ tables
- Creates secure policies for different user roles
- Adds security definer functions with explicit search_path
- Sets up proper permissions

### 2. Property Sources System (20250928001000)
**Purpose:** Create centralized URL management system
**What it does:**
- Creates `property_sources` table for URL management
- Adds priority-based scraping logic
- Implements success rate tracking
- Creates helper functions for batch processing

### 3. Cost Monitoring Functions (20250928002000)
**Purpose:** Add comprehensive cost tracking and analytics
**What it does:**
- Creates cost monitoring functions
- Adds daily/weekly cost analytics
- Implements performance metrics
- Creates cost projection functions

### 4. URL Migration (20250928003000)
**Purpose:** Migrate existing URLs to new system
**What it does:**
- Migrates data from `apartments` and `scraped_properties` tables
- Links existing data to new property sources
- Updates relationships with foreign keys
- Optimizes initial scraping schedule

## ✅ Verification Steps

After running migrations, verify the setup:

### 1. Check Tables Created
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('property_sources', 'property_intelligence', 'scraping_costs');
```

### 2. Check Functions Created
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%property_source%' 
OR routine_name LIKE '%scraping_cost%';
```

### 3. Check RLS Policies
```sql
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public';
```

### 4. Check Data Migration
```sql
-- Check property sources
SELECT COUNT(*) as total_sources FROM property_sources;

-- Check migrated relationships
SELECT COUNT(*) as linked_properties 
FROM scraped_properties 
WHERE property_source_id IS NOT NULL;
```

## 🔧 Troubleshooting

### Common Issues:

#### "Permission Denied" Errors
- Ensure you're using the service role key (not anon key)
- Check if your user has proper database permissions

#### "Table Already Exists" Errors
- Migrations use `IF NOT EXISTS` clauses
- Safe to re-run if needed
- Check for partial migrations

#### "Function Does Not Exist" Errors
- Ensure migrations run in order
- Some functions depend on others
- Re-run the specific migration file

#### "Foreign Key Constraint" Errors
- Ensure base tables exist before running migration 4
- Check data integrity in existing tables

### Migration Rollback (if needed)

If you need to rollback migrations:

```sql
-- Drop new tables (BE CAREFUL!)
DROP TABLE IF EXISTS property_sources CASCADE;
DROP TABLE IF EXISTS property_intelligence CASCADE;
DROP TABLE IF EXISTS scraping_costs CASCADE;

-- Remove added columns
ALTER TABLE scraped_properties DROP COLUMN IF EXISTS property_source_id;
ALTER TABLE scraping_queue DROP COLUMN IF EXISTS property_source_id;

-- Disable RLS (if needed)
ALTER TABLE apartments DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables
```

## 🎯 Expected Results

After successful migration:

- ✅ **10+ tables** with RLS enabled
- ✅ **property_sources** table with sample data
- ✅ **Cost monitoring** functions available
- ✅ **Existing data** migrated and linked
- ✅ **Security policies** active
- ✅ **Enhanced functions** deployed

## 📞 Getting Help

If you encounter issues:

1. **Check migration logs** for specific error messages
2. **Verify prerequisites** (tables, permissions, etc.)
3. **Run verification queries** to check current state
4. **Use Supabase Dashboard** SQL editor for manual fixes

## 🚀 Next Steps

After successful migration:

1. **Test the system**: `./test-enhanced-system.sh`
2. **Deploy functions**: `./deploy-scraper.sh`
3. **Verify operation**: `./control-scraper.sh status`

---

**⚠️ Important:** Always backup your database before running migrations in production!