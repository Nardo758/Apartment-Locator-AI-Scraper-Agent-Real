# 🚀 How to Start the Scraper System

**Step-by-step guide to get your scraper running**

---

## ✅ Prerequisites Check

Before starting, make sure you have:
- ✅ Supabase running locally OR access to cloud Supabase
- ✅ Environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- ✅ Node.js installed (for control panel)

---

## 🎯 Quick Start (5 Minutes)

### **Step 1: Open Terminal/PowerShell**

```powershell
# Open PowerShell or Command Prompt
# Press Windows Key + R, type "powershell", press Enter

# Navigate to your project
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real
```

---

### **Step 2: Load Environment Variables**

```powershell
# Load environment variables from .env file
.\load-env.ps1
```

**Expected output**:

```text
Loading environment variables from .env file...
   Loaded: SUPABASE_URL = http://127.0.0.1:54380
   Loaded: SUPABASE_SERVICE_ROLE_KEY = ****...****
Environment variables loaded successfully!
```

---

### **Step 3: Check System Status**

```powershell
# Check if Supabase is running
supabase status
```

**Expected output**:

```text
supabase local development setup is running.
API URL: http://127.0.0.1:54380
DB URL: postgresql://postgres:postgres@localhost:54350/postgres
Studio URL: http://127.0.0.1:54381
```

**If NOT running**:
```powershell
# Start Supabase
supabase start
```

---

### **Step 4: Check Control Panel**

```powershell
# Check current system status
node control-panel.mjs status
```

**Expected output**:

```text
🎛️  SCRAPER CONTROL PANEL - System Status
======================================================================

📊 Global Settings:
   System: 🟢 ENABLED
   Max Concurrent Jobs: 5
   Daily Cost Limit: $50

🔧 Components:
   🟢 ON  AI Scraper Worker
   🟢 ON  Command Station
   ...
```

---

### **Step 5: Enable the Main Scraper**

```powershell
# Enable the AI scraper worker (if not already enabled)
node control-panel.mjs enable ai-scraper-worker
```

**Output**:

```text
✅ Enabled: AI Scraper Worker
   Schedule: 0 2 * * *
```

---

### **Step 6: Test Run**

```powershell
# Run a test scrape immediately
node control-panel.mjs run-now ai-scraper-worker
```

**This will**:

- Trigger the scraper function
- Show you the response
- Test that everything is connected

---

### **Step 7: Set Your Schedule**

```powershell
# For daily scraping at 2 AM
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# OR for weekly scraping (Sunday at 2 AM)
node control-panel.mjs schedule ai-scraper-worker "0 2 * * 0"
```

---

### **Step 8: Verify Everything Works**

```powershell
# Check status again
node control-panel.mjs status

# Check database
node test_connectivity.mjs
```

---

## 🎯 Complete Setup Example

**Copy and paste these commands one by one:**

```powershell
# 1. Navigate to project
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real

# 2. Load environment variables
.\load-env.ps1

# 3. Start Supabase (if not running)
supabase start

# 4. Check status
node control-panel.mjs status

# 4. Enable scraper
node control-panel.mjs enable ai-scraper-worker

# 5. Set daily schedule (2 AM)
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# 6. Test it now
node control-panel.mjs run-now ai-scraper-worker

# 7. Verify
node control-panel.mjs status
```

---

## 🔍 Detailed Walkthrough

### **Option A: Daily Scraping (Recommended)**

Perfect for keeping data fresh without overwhelming costs.

```powershell
# Step 1: Navigate to project
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real

# Step 2: Ensure Supabase is running
supabase status
# If not running: supabase start

# Step 3: Enable components
node control-panel.mjs enable ai-scraper-worker
node control-panel.mjs enable command-station

# Step 4: Set schedule (runs every day at 2 AM)
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# Step 5: Test immediately
node control-panel.mjs run-now ai-scraper-worker

# Step 6: Check results
node control-panel.mjs status
```

**What happens**:

- ✅ Scraper runs automatically every day at 2 AM
- ✅ New properties are added to database
- ✅ Price changes are tracked
- ✅ Command station monitors everything

---

### **Option B: Weekly Scraping (Budget-Friendly)**

Saves costs, good for less time-sensitive data.

```powershell
# Navigate to project
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real

# Enable components
node control-panel.mjs enable ai-scraper-worker
node control-panel.mjs enable claude-queue-builder

# Set weekly schedule (Sunday at 2 AM)
node control-panel.mjs schedule ai-scraper-worker "0 2 * * 0"

# Build queue Saturday night
node control-panel.mjs schedule claude-queue-builder "0 23 * * 6"

# Test now
node control-panel.mjs run-now ai-scraper-worker

# Verify
node control-panel.mjs status
```

---

### **Option C: On-Demand Only**

Run manually whenever you want.

```powershell
# Navigate to project
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real

# Enable scraper
node control-panel.mjs enable ai-scraper-worker

# Don't set a schedule - just run manually when needed
node control-panel.mjs run-now ai-scraper-worker

# Run again anytime
node control-panel.mjs run-now ai-scraper-worker
```

---

## 🖥️ Keep Supabase Running

### **Option 1: Keep Terminal Open**

```powershell
# In PowerShell window 1
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real
supabase start
# Leave this window open

# In PowerShell window 2
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real
node control-panel.mjs status
```

### **Option 2: Run as Background Service**

Supabase runs in Docker containers - they keep running even if you close PowerShell.

```powershell
# Start Supabase
supabase start

# Close PowerShell - Supabase keeps running!

# Check it's still running (open new PowerShell)
supabase status
```

---

## 🔄 Managing the System

### **Daily Management**

```powershell
# Morning: Check what happened overnight
node control-panel.mjs status

# View recent properties
node test_connectivity.mjs

# Check Supabase Studio
# Open browser: http://127.0.0.1:54381
```

### **Weekly Management**

```powershell
# Check status
node control-panel.mjs status

# Review database
# Open Supabase Studio: http://127.0.0.1:54381
# Go to Table Editor > scraped_properties
```

### **If Something Goes Wrong**

```powershell
# Stop everything
node control-panel.mjs disable-all

# Check what's wrong
node control-panel.mjs status
supabase status

# Restart Supabase
supabase stop
supabase start

# Re-enable scraper
node control-panel.mjs enable ai-scraper-worker
```

---

## 🎛️ Windows Startup (Optional)

### **Make Supabase Start Automatically**

Create a startup script:

1. **Create file**: `start-scraper.bat`
   ```batch
   @echo off
   cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real
   supabase start
   ```

2. **Add to Windows Startup**:
   - Press `Win + R`
   - Type: `shell:startup`
   - Copy `start-scraper.bat` to that folder

3. **Now Supabase starts when Windows starts!**

---

## ⏰ Using Windows Task Scheduler

### **Schedule the Scraper with Windows**

This ensures it runs even if your computer restarts.

**Step 1: Open Task Scheduler**
- Press `Win + R`
- Type: `taskschd.msc`
- Press Enter

**Step 2: Create Task**
- Click "Create Basic Task"
- Name: "Apartment Scraper Daily"
- Trigger: Daily at 2:00 AM
- Action: Start a program
- Program: `node`
- Arguments: `control-panel.mjs run-now ai-scraper-worker`
- Start in: `C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real`

**Step 3: Test**
- Right-click task → Run
- Check if it works

---

## 🔍 Troubleshooting

### **Problem: "Supabase not running"**

```powershell
# Check if Docker is running
docker ps

# Restart Supabase
supabase stop
supabase start

# Check status
supabase status
```

---

### **Problem: "Cannot find module"**

```powershell
# Make sure you're in the right directory
cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real

# Verify files exist
ls control-panel.mjs
ls package.json

# Install dependencies if needed
npm install
```

---

### **Problem: "Environment variable not set"**

```powershell
# Check environment variables
echo $env:SUPABASE_URL
echo $env:SUPABASE_SERVICE_ROLE_KEY

# Set them if missing (they should be set automatically by supabase start)
$env:SUPABASE_URL = "http://127.0.0.1:54380"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"
```

---

### **Problem: "Function not found"**

The function might not be deployed or running locally.

```powershell
# Check Supabase logs
supabase functions logs ai-scraper-worker

# List functions
supabase functions list

# Serve function locally
supabase functions serve ai-scraper-worker
```

---

## 📊 Monitoring

### **Check Status Regularly**

```powershell
# Quick status
node control-panel.mjs status

# Database check
node test_connectivity.mjs

# Supabase check
supabase status
```

### **View in Browser**

**Supabase Studio** (Visual Interface):
```
http://127.0.0.1:54381
```

**What you can do**:
- View all tables
- Run SQL queries
- See scraped properties
- Monitor logs

---

## ✅ Success Checklist

After setup, you should have:

- [x] Supabase running (check: `supabase status`)
- [x] Control panel working (check: `node control-panel.mjs status`)
- [x] AI Scraper enabled (shows 🟢 ON)
- [x] Schedule set (shows ⏰ with your cron)
- [x] Test run successful (no errors)
- [x] Database populated (6+ properties)
- [x] Command station active (shows 🟢 ON)

---

## 🎯 What Happens Next

### **With Daily Schedule (0 2 * * *)**:
- ⏰ Every day at 2 AM
- 🤖 Scraper automatically runs
- 📊 New properties added to database
- 💰 Costs tracked
- ✅ You can check results anytime

### **How to Check Results**:
```powershell
# In PowerShell
node control-panel.mjs status

# In Browser
# Open: http://127.0.0.1:54381
# Go to: Table Editor → scraped_properties
```

---

## 🆘 Quick Commands Reference

```powershell
# Status check
node control-panel.mjs status

# Enable scraper
node control-panel.mjs enable ai-scraper-worker

# Run now
node control-panel.mjs run-now ai-scraper-worker

# Schedule daily (2 AM)
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# Stop everything
node control-panel.mjs disable-all

# Reset
node control-panel.mjs reset

# Help
node control-panel.mjs help
```

---

## 📝 Summary

**To start scraping right now:**
1. Open PowerShell
2. `cd C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real`
3. `supabase start` (if not running)
4. `node control-panel.mjs enable ai-scraper-worker`
5. `node control-panel.mjs run-now ai-scraper-worker`
6. Done! ✅

**For automatic daily scraping:**
- Add: `node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"`

**Your scraper is now ready to run! 🎉**

---

*Need help? Check CONTROL_PANEL_GUIDE.md for detailed documentation*
