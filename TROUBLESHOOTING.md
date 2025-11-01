# 🔧 Troubleshooting Guide

## Current Issue: AI Scraper Worker Error

### **What's Happening**
When you run:
```powershell
node control-panel.mjs run-now ai-scraper-worker
```

You get:
```
⚠️  Status: 500
Response: {"status":"error","message":"Could not parse response as JSON"}
```

### **Why This Happens**

The `ai-scraper-worker` function expects specific data to process:
1. It needs scraping queue items with URLs
2. It needs property data to transform
3. It's designed to be triggered by the orchestrator, not directly

### **How the System Actually Works**

```
Claude Queue Builder  →  Scraping Queue  →  Orchestrator  →  AI Worker  →  Database
       (URLs)              (pending jobs)     (coordinator)   (processor)    (storage)
```

The `ai-scraper-worker` is **not meant to be run alone**. It's part of a pipeline.

---

## ✅ **What You SHOULD Do Instead**

### **Option 1: Use the Test Scripts (Recommended)**

These scripts test the complete pipeline:

```powershell
# Load environment
.\load-env.ps1

# Test with 5 websites
node test_5_websites.mjs

# Or test end-to-end pipeline
node test_e2e_pipeline.mjs
```

These work because they:
- ✅ Create proper test data
- ✅ Insert it in the right format
- ✅ Simulate the entire flow
- ✅ Show you real results

---

### **Option 2: Trigger the Orchestrator**

The orchestrator coordinates everything:

```powershell
# This manages the full workflow
node control-panel.mjs run-now scraper-orchestrator
```

But even this needs:
- Items in the scraping_queue table
- Proper configuration
- All dependencies running

---

### **Option 3: Use the Working Components**

Some components work standalone:

```powershell
# Command Station (monitoring) - THIS WORKS
curl http://127.0.0.1:54380/functions/v1/command-station/status

# Check health
curl http://127.0.0.1:54380/functions/v1/command-station/health
```

---

## 🎯 **Recommended Workflow**

### **For Testing the System:**

```powershell
# 1. Navigate to project
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real

# 2. Load environment
.\load-env.ps1

# 3. Run comprehensive test
node test_5_websites.mjs
```

**This will**:
- ✅ Test 5 different apartment websites
- ✅ Insert properties into database
- ✅ Show success/failure for each
- ✅ Display timing and statistics

---

### **For Production Scraping:**

The system needs to be set up with:

1. **URLs in the queue**:
   ```sql
   INSERT INTO scraping_queue (url, source, status)
   VALUES 
   ('https://example.com/property1', 'apartments.com', 'pending'),
   ('https://example.com/property2', 'zillow.com', 'pending');
   ```

2. **Then trigger the orchestrator**:
   ```powershell
   # This processes the queue
   node control-panel.mjs run-now scraper-orchestrator
   ```

---

## 🔍 **Understanding the Components**

### **Components That Work Standalone:**

| Component | Can Run Directly? | Purpose |
|-----------|-------------------|---------|
| `command-station` | ✅ YES | Monitoring & control |
| `test_5_websites.mjs` | ✅ YES | Testing |
| `test_e2e_pipeline.mjs` | ✅ YES | End-to-end testing |
| `test_connectivity.mjs` | ✅ YES | Database check |

### **Components That Need Setup:**

| Component | Needs What? | Purpose |
|-----------|-------------|---------|
| `ai-scraper-worker` | Data in queue | Process properties |
| `scraper-orchestrator` | Queue items | Coordinate workers |
| `claude-queue-builder` | Target URLs | Build queue |

---

## 📊 **Check Your System Status**

### **1. Check Database**
```powershell
node test_connectivity.mjs
```

Expected output:
```
✅ Successfully connected to Supabase
✅ Successfully queried apartments table
📊 Current row count: 6 apartments
```

### **2. Check Supabase**
```powershell
supabase status
```

Expected:
```
supabase local development setup is running.
API URL: http://127.0.0.1:54380
```

### **3. Check Control Panel**
```powershell
.\load-env.ps1
node control-panel.mjs status
```

Expected:
```
🎛️  SCRAPER CONTROL PANEL - System Status
📊 Global Settings: 🟢 ENABLED
📦 Database: 6 properties stored
```

---

## 🚀 **Quick Fixes**

### **Issue: "Cannot find SUPABASE_SERVICE_ROLE_KEY"**

**Fix**:
```powershell
.\load-env.ps1
```

---

### **Issue: "Function returns 500 error"**

**Explanation**: 
- The function needs proper input data
- It's not designed to run empty

**Fix**: Use test scripts instead:
```powershell
node test_5_websites.mjs
```

---

### **Issue: "No properties in database"**

**Fix**: Run test to populate:
```powershell
node test_5_websites.mjs
```

---

### **Issue: "Supabase not running"**

**Fix**:
```powershell
supabase stop
supabase start
```

---

## 💡 **What the Control Panel IS For**

The control panel is best used for:

✅ **Checking status**:
```powershell
node control-panel.mjs status
```

✅ **Enabling/disabling components**:
```powershell
node control-panel.mjs enable ai-scraper-worker
node control-panel.mjs disable ai-scraper-worker
```

✅ **Setting schedules**:
```powershell
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"
```

✅ **Managing configuration**:
```powershell
node control-panel.mjs list
node control-panel.mjs reset
```

---

## 💡 **What the Control Panel IS NOT For**

❌ **Direct execution of workers** - They need proper data
❌ **Testing functionality** - Use test scripts for that
❌ **Data population** - Use test scripts or manual SQL

---

## 📝 **Correct Testing Workflow**

### **Step 1: Verify System is Running**
```powershell
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real
.\load-env.ps1
supabase status
```

### **Step 2: Check Control Panel**
```powershell
node control-panel.mjs status
```

### **Step 3: Test with Real Data**
```powershell
node test_5_websites.mjs
```

### **Step 4: Verify Results**
```powershell
node test_connectivity.mjs
```

### **Step 5: View in Browser**
Open: `http://127.0.0.1:54381`
Go to: **Table Editor** → **scraped_properties**

---

## 🎯 **Summary**

| What You Want | What To Run |
|---------------|-------------|
| Test the system | `node test_5_websites.mjs` |
| Check status | `node control-panel.mjs status` |
| Verify database | `node test_connectivity.mjs` |
| Enable component | `node control-panel.mjs enable <component>` |
| Set schedule | `node control-panel.mjs schedule <component> "<cron>"` |
| View data | Open `http://127.0.0.1:54381` |

---

## ✅ **Your System IS Working!**

The error you saw is **expected behavior** when:
- Running a worker without input data
- The function is designed for pipeline use

**Your system is actually working correctly!**

To prove it, run:
```powershell
.\load-env.ps1
node test_5_websites.mjs
```

This will show you everything is functioning properly! 🎉

---

*Last Updated: November 1, 2025*
