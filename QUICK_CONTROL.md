# ⚡ Quick Control Reference

**One-page cheat sheet for managing your scraper**

---

## 🚀 Most Common Commands

```bash
# Check status
node control-panel.mjs status

# Enable scraper (daily at 2 AM)
node control-panel.mjs enable ai-scraper-worker

# Run scraper now
node control-panel.mjs run-now ai-scraper-worker

# Stop everything
node control-panel.mjs disable-all
```

---

## ⏰ Quick Schedules

```bash
# Daily at 2 AM
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# Weekly on Sunday
node control-panel.mjs schedule ai-scraper-worker "0 0 * * 0"

# Every 6 hours
node control-panel.mjs schedule scraper-orchestrator "0 */6 * * *"

# Business hours (9-5, Mon-Fri)
node control-panel.mjs schedule ai-scraper-worker "0 9-17 * * 1-5"
```

---

## 📋 Components

| Component | Purpose |
|-----------|---------|
| `ai-scraper-worker` | Main scraper (use this!) |
| `claude-queue-builder` | Builds job queue |
| `command-station` | Monitoring (keep ON) |
| `scraper-orchestrator` | Coordinates workers |
| `scheduled-scraper` | Cleanup jobs |

---

## 🎯 Recommended Setup

### For Most Users:
```bash
# Enable main components
node control-panel.mjs enable ai-scraper-worker
node control-panel.mjs enable command-station

# Daily scraping at 2 AM
node control-panel.mjs schedule ai-scraper-worker "0 2 * * *"

# Test it works
node control-panel.mjs run-now ai-scraper-worker
```

### For Weekly Scraping:
```bash
# Weekly on Sunday at 2 AM
node control-panel.mjs schedule ai-scraper-worker "0 2 * * 0"
node control-panel.mjs schedule claude-queue-builder "0 1 * * 0"
```

---

## 🔧 Common Tasks

**Start scraping**:
```bash
node control-panel.mjs enable ai-scraper-worker
node control-panel.mjs run-now ai-scraper-worker
```

**Stop scraping**:
```bash
node control-panel.mjs disable ai-scraper-worker
```

**Emergency stop (everything)**:
```bash
node control-panel.mjs disable-all
```

**Check what's running**:
```bash
node control-panel.mjs status
```

**Reset everything**:
```bash
node control-panel.mjs reset
```

---

## ⏱️ Cron Cheat Sheet

```
* * * * *
│ │ │ │ └── Day of week (0-6, 0=Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

| Schedule | Meaning |
|----------|---------|
| `0 2 * * *` | 2 AM daily |
| `0 0 * * 0` | Midnight Sunday |
| `0 */6 * * *` | Every 6 hours |
| `*/30 * * * *` | Every 30 min |
| `0 9 * * 1-5` | 9 AM weekdays |

---

## 📊 Files

- **`control-panel.mjs`** - The control tool
- **`scraper-config.json`** - Your settings
- **`CONTROL_PANEL_GUIDE.md`** - Full documentation

---

## 💡 Tips

✅ **Always keep** `command-station` enabled  
✅ **Test first** with `run-now` before scheduling  
✅ **Start with** daily or weekly schedules  
✅ **Check status** regularly  
✅ **Use reset** if something breaks  

---

## 🆘 Help

```bash
node control-panel.mjs help
```

Full docs: See `CONTROL_PANEL_GUIDE.md`

---

*Keep this file handy for quick reference!*
