# 🎛️ Scraper Control Panel Guide

**Simple Component Management & Scheduling**

---

## Quick Start

### Check System Status
```bash
node control-panel.mjs status
```

### Enable a Component
```bash
node control-panel.mjs enable ai-scraper-worker
```

### Set a Schedule
```bash
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"
```

### Run Immediately
```bash
node control-panel.mjs run-now ai-scraper-worker
```

---

## Available Components

| Component | Description | Default Schedule |
|-----------|-------------|------------------|
| **ai-scraper-worker** | Primary AI-powered scraper | Daily at 2 AM |
| **claude-queue-builder** | Builds scraping queues with AI | Weekly (Sunday 1 AM) |
| **command-station** | Control & monitoring center | Always Active |
| **scraper-orchestrator** | Coordinates multiple workers | Every 6 hours |
| **scheduled-scraper** | Runs scheduled jobs | Weekly (Sunday) |

---

## Common Commands

### 📊 **View Status**
```bash
# See everything at a glance
node control-panel.mjs status
```

**Shows**:
- ✅ Which components are ON/OFF
- ⏰ Current schedules
- 📈 Run counts and last run times
- 💰 Cost limits and settings
- 📦 Database statistics

---

### 🟢 **Enable Components**

```bash
# Enable single component
node control-panel.mjs enable ai-scraper-worker

# Enable all components
node control-panel.mjs enable-all
```

---

### 🔴 **Disable Components**

```bash
# Disable single component
node control-panel.mjs disable ai-scraper-worker

# Emergency stop - disable everything
node control-panel.mjs disable-all
```

---

### ⏰ **Set Schedules**

#### Daily Schedules
```bash
# Every day at 2 AM
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# Every day at noon
node control-panel.mjs schedule ai-scraper-worker "0 12 * * *"

# Every day at 6 AM and 6 PM
node control-panel.mjs schedule ai-scraper-worker "0 6,18 * * *"
```

#### Weekly Schedules
```bash
# Every Sunday at midnight
node control-panel.mjs schedule claude-queue-builder "0 0 * * 0"

# Every Monday at 9 AM
node control-panel.mjs schedule ai-scraper-worker "0 9 * * 1"

# Every Friday at 5 PM
node control-panel.mjs schedule scheduled-scraper "0 17 * * 5"
```

#### Hourly Schedules
```bash
# Every hour
node control-panel.mjs schedule scraper-orchestrator "0 * * * *"

# Every 6 hours
node control-panel.mjs schedule scraper-orchestrator "0 */6 * * *"

# Every 30 minutes
node control-panel.mjs schedule ai-scraper-worker "*/30 * * * *"
```

#### Business Hours
```bash
# 9 AM - 5 PM, Monday-Friday
node control-panel.mjs schedule ai-scraper-worker "0 9-17 * * 1-5"

# Every hour during business hours
node control-panel.mjs schedule scraper-orchestrator "0 9-17 * * 1-5"
```

---

### 🚀 **Run Immediately**

```bash
# Run a component right now (bypasses schedule)
node control-panel.mjs run-now ai-scraper-worker

# Run queue builder now
node control-panel.mjs run-now claude-queue-builder
```

---

## Cron Schedule Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of Week (0-6, Sunday=0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of Month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `* * * * *` | Every minute | Continuous scraping |
| `*/15 * * * *` | Every 15 minutes | Frequent checks |
| `0 * * * *` | Every hour | Hourly scraping |
| `0 */6 * * *` | Every 6 hours | 4 times/day |
| `0 2 * * *` | Daily at 2 AM | Once per day |
| `0 0 * * 0` | Weekly on Sunday | Weekly scraping |
| `0 0 1 * *` | Monthly on 1st | Monthly update |
| `0 9-17 * * 1-5` | Business hours | Mon-Fri 9AM-5PM |

---

## Configuration File

The control panel stores settings in **`scraper-config.json`**:

```json
{
  "components": {
    "ai-scraper-worker": {
      "enabled": true,
      "schedule": "0 2 * * *",
      "last_run": "2025-11-01T02:00:00Z",
      "run_count": 42
    },
    "claude-queue-builder": {
      "enabled": true,
      "schedule": "0 1 * * 0",
      "last_run": null,
      "run_count": 0
    }
  },
  "global": {
    "enabled": true,
    "max_concurrent_jobs": 5,
    "daily_cost_limit": 50,
    "auto_retry": true
  },
  "last_updated": "2025-11-01T22:30:19Z"
}
```

### Manual Editing

You can edit `scraper-config.json` directly if needed:

```bash
# Windows
notepad scraper-config.json

# Mac/Linux
nano scraper-config.json
```

---

## Common Workflows

### 🌅 **Morning Scraping Setup**
```bash
# Enable components
node control-panel.mjs enable ai-scraper-worker
node control-panel.mjs enable claude-queue-builder

# Set morning schedule (6 AM daily)
node control-panel.mjs schedule ai-scraper-worker "0 6 * * *"

# Build queue night before (Sunday 11 PM)
node control-panel.mjs schedule claude-queue-builder "0 23 * * 0"

# Check status
node control-panel.mjs status
```

### 🌙 **Night Scraping Setup**
```bash
# Set night schedule (2 AM daily)
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# Run orchestrator every 6 hours
node control-panel.mjs schedule scraper-orchestrator "0 */6 * * *"
```

### 📅 **Weekly Batch Setup**
```bash
# Sunday midnight scraping
node control-panel.mjs schedule ai-scraper-worker "0 0 * * 0"

# Build queue Saturday night
node control-panel.mjs schedule claude-queue-builder "0 23 * * 6"
```

### ⚡ **High-Frequency Setup**
```bash
# Scrape every hour
node control-panel.mjs schedule ai-scraper-worker "0 * * * *"

# Orchestrate every 30 minutes
node control-panel.mjs schedule scraper-orchestrator "*/30 * * * *"
```

### 🛑 **Emergency Stop**
```bash
# Disable everything immediately
node control-panel.mjs disable-all

# Check what's running
node control-panel.mjs status

# Re-enable when ready
node control-panel.mjs enable-all
```

---

## Recommended Schedules

### 💰 **Budget-Conscious** (Minimize costs)
```bash
# Weekly scraping only
node control-panel.mjs schedule ai-scraper-worker "0 2 * * 0"
node control-panel.mjs schedule claude-queue-builder "0 1 * * 0"
node control-panel.mjs schedule scraper-orchestrator "0 3 * * 0"
```

### 📈 **Balanced** (Good performance & cost)
```bash
# Daily night scraping
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"
node control-panel.mjs schedule claude-queue-builder "0 1 * * 0"
node control-panel.mjs schedule scraper-orchestrator "0 */12 * * *"
```

### 🚀 **Aggressive** (Maximum freshness)
```bash
# Multiple times per day
node control-panel.mjs schedule ai-scraper-worker "0 2,14 * * *"
node control-panel.mjs schedule scraper-orchestrator "0 */6 * * *"
node control-panel.mjs schedule claude-queue-builder "0 1 * * *"
```

### 💼 **Business Hours Only**
```bash
# 9 AM - 5 PM, weekdays only
node control-panel.mjs schedule ai-scraper-worker "0 9-17 * * 1-5"
node control-panel.mjs schedule scraper-orchestrator "0 9-17 * * 1-5"
```

---

## Monitoring

### Check Recent Activity
```bash
# View status with last run times
node control-panel.mjs status
```

### Verify Database
The status command shows:
- 📦 Number of properties in database
- 🔧 Component states (ON/OFF)
- ⏰ Last run timestamps
- 📊 Run counts

### Check Logs
```bash
# For Supabase functions
supabase functions logs ai-scraper-worker --limit 50

# For specific component
supabase functions logs claude-queue-builder
```

---

## Troubleshooting

### Component Won't Enable
```bash
# Reset to defaults
node control-panel.mjs reset

# Check status
node control-panel.mjs status

# Re-enable component
node control-panel.mjs enable ai-scraper-worker
```

### Schedule Not Working
```bash
# Verify schedule format
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# Check if component is enabled
node control-panel.mjs status

# Test with immediate run
node control-panel.mjs run-now ai-scraper-worker
```

### Nothing Running
```bash
# Check global system status
node control-panel.mjs status

# Enable system
node control-panel.mjs enable-all

# Verify database connection
node test_connectivity.mjs
```

### Config File Corrupted
```bash
# Backup is automatically created
# Restore from backup:
cp scraper-config.json.backup scraper-config.json

# Or reset to defaults:
node control-panel.mjs reset
```

---

## Advanced Usage

### Global Settings

Edit `scraper-config.json` to adjust:

```json
{
  "global": {
    "enabled": true,              // Master on/off switch
    "max_concurrent_jobs": 5,     // Parallel job limit
    "daily_cost_limit": 50,       // Max $ per day
    "auto_retry": true            // Retry failed jobs
  }
}
```

### Component Priority

Run in order:
1. `claude-queue-builder` - Builds job queue
2. `scraper-orchestrator` - Coordinates workers
3. `ai-scraper-worker` - Does actual scraping
4. `scheduled-scraper` - Cleanup/special jobs

### Custom Schedules

For complex schedules, use multiple cron patterns:

```bash
# Morning and evening scraping
node control-panel.mjs schedule ai-scraper-worker "0 6,18 * * *"

# Weekdays only, every 2 hours
node control-panel.mjs schedule ai-scraper-worker "0 */2 * * 1-5"

# Different schedules for different days
# (You'll need to manage this with external cron)
```

---

## Integration with System Cron

### Linux/Mac

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add entries
0 2 * * * cd /path/to/project && node control-panel.mjs run-now ai-scraper-worker
0 1 * * 0 cd /path/to/project && node control-panel.mjs run-now claude-queue-builder
```

### Windows Task Scheduler

Create tasks that run:
```powershell
node C:\path\to\project\control-panel.mjs run-now ai-scraper-worker
```

---

## Best Practices

### ✅ Do's

- ✅ **Start small** - Enable one component at a time
- ✅ **Test first** - Use `run-now` before setting schedules
- ✅ **Monitor costs** - Check status regularly
- ✅ **Use command-station** - Keep it always on for monitoring
- ✅ **Backup config** - Config auto-backs up on reset

### ❌ Don'ts

- ❌ Don't run all components simultaneously without testing
- ❌ Don't set very frequent schedules (< 30 min) without monitoring costs
- ❌ Don't disable command-station (needed for monitoring)
- ❌ Don't edit config file while commands are running

---

## Quick Reference Card

```bash
# Status & Info
node control-panel.mjs status        # Show everything
node control-panel.mjs list          # List components
node control-panel.mjs help          # Show help

# Enable/Disable
node control-panel.mjs enable <component>
node control-panel.mjs disable <component>
node control-panel.mjs enable-all
node control-panel.mjs disable-all

# Scheduling
node control-panel.mjs schedule <component> "<cron>"
node control-panel.mjs run-now <component>

# Maintenance
node control-panel.mjs reset         # Reset to defaults
```

---

## Summary

🎛️ **Control Panel** = Easy way to manage your scraper system

**Key Features**:
- ✅ Simple on/off controls for each component
- ⏰ Flexible scheduling with cron syntax
- 🚀 Immediate execution for testing
- 📊 Status dashboard
- 💾 Persistent configuration
- 🔄 Easy reset to defaults

**Configuration File**: `scraper-config.json`  
**All Components**: Managed individually or together  
**Schedules**: Standard cron format (minute hour day month weekday)  

Your scraper system is now easy to control! 🎉

---

*Last Updated: November 1, 2025*  
*Control Panel Version: 1.0.0*
