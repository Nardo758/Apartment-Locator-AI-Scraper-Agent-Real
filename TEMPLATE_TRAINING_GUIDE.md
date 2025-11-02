# 🎓 Template #1 Training Guide: single-property-premium

## 📋 Overview

**Template:** single-property-premium  
**Sites:** 39 luxury apartment properties  
**Expected Impact:** +27 properties to database (70% success rate)  
**ROI:** 39:1 (train 1 pattern → scrape 39 sites)

---

## 🎯 Test Sites (Start Here)

Pick 2-3 of these to analyze:

1. **livealtitudeatlanta.com**
   - URL: https://livealtitudeatlanta.com/
   - Type: Modern luxury high-rise
   - Why: Good example of "live*" branding pattern

2. **thedagnymidtown.com**
   - URL: https://www.thedagnymidtown.com/the-dagny-atlanta-ga
   - Type: Boutique midtown property
   - Why: Good example of "the*" branding pattern

3. **novelwestmidtown.com**
   - URL: https://www.novelwestmidtown.com/
   - Type: West Midtown location
   - Why: Different layout style to test variations

---

## 🔍 What to Look For

When you visit each site, identify:

### 1. **Property Name**
- Usually in header/logo
- Example: "Altitude Atlanta", "The Dagny", "Novel West Midtown"

### 2. **Pricing** (Most Important!)
- Look for: "$1,500/mo", "$2,000 per month", "Starting at $1,800"
- Common locations:
  - Floor plans page
  - Pricing section
  - Availability page
  - Hero section

### 3. **Bedrooms & Bathrooms**
- Look for: "1 Bed | 1 Bath", "2BR/2BA", "Studio"
- Usually near pricing
- Watch for: Sometimes listed per floor plan

### 4. **Square Footage**
- Look for: "650 sq ft", "850 sqft", "1,200 SF"
- Usually with bed/bath info

### 5. **Availability**
- Check if units are available
- Look for "View Availability", "Check Availability"

---

## 🛠️ How to Analyze (Browser DevTools)

### Step 1: Open Site
Visit one of the test sites in Chrome/Edge

### Step 2: Open DevTools
Press `F12` or Right-click → Inspect

### Step 3: Find Elements
1. Right-click on pricing → "Inspect"
2. Look at the HTML structure
3. Note the CSS class or ID

### Example - Finding Pricing:
```html
<!-- You might see: -->
<div class="pricing-info">
  <span class="price">$1,500</span>
  <span class="period">/month</span>
</div>

<!-- CSS Selector would be: -->
.pricing-info .price
or
.price
```

### Step 4: Test Selector in Console
In DevTools Console, try:
```javascript
document.querySelector('.price').textContent
// Should output: "$1,500"
```

### Step 5: Document Your Findings
For each site, note:
```
Site: livealtitudeatlanta.com
✅ Property Name: <h1 class="site-title">
✅ Pricing: <span class="price-amount">
✅ Bedrooms: <div class="beds">
✅ Bathrooms: <div class="baths">
✅ Square Feet: <span class="sqft">
```

---

## 📝 What to Share

After analyzing 2-3 sites, share:

### For Each Site:

**1. Site URL**
**2. Can you find pricing?** Yes/No
**3. Where is pricing located?**
   - Floor plans page?
   - Availability page?
   - Homepage?

**4. CSS Selectors Found:**
```
Property Name: [selector]
Pricing: [selector]
Bedrooms: [selector]
Bathrooms: [selector]
Square Feet: [selector]
```

**5. Common Patterns:**
- Do sites use similar class names?
- Do they all have a "Floor Plans" link?
- Is data loaded dynamically (AJAX)?

**6. Challenges:**
- Any sites that don't show pricing?
- Any sites that require interaction (click buttons)?
- Any sites with unusual layouts?

---

## 🎯 Example Analysis

### Sample Finding:

```markdown
**Site:** livealtitudeatlanta.com

**Pricing Found:** Yes
**Location:** Floor Plans page (/floorplans)

**Selectors:**
- Property Name: `.site-header h1`
- Pricing: `.fp-price` (multiple on page, one per unit)
- Bedrooms: `.bed-count`
- Bathrooms: `.bath-count`  
- Square Feet: `.sqft-range`

**Pattern:** Site uses standard floor plan cards. Each card has:
- Unit name/type
- Bed/bath
- Price range
- Square footage

**Challenges:** 
- Prices shown as ranges: "$1,500 - $1,800"
- Need to extract lowest price
- Multiple floor plans on one page
```

---

## 🚀 After Analysis

Once you share your findings, I'll:

1. **Build the template scraper** based on patterns
2. **Test on your sample sites**
3. **Refine based on results**
4. **Deploy to all 39 sites** in the template
5. **Track performance** in database

---

## 📊 Success Metrics

**Target:** 70% success rate (27+ sites working)

**Success means:**
- ✅ Property name extracted
- ✅ Pricing extracted ($500-$10,000 range)
- ✅ Bedrooms extracted (0-10)
- ✅ Bathrooms extracted (0-3)
- ✅ Data saved to production database

---

## 💡 Tips

### Quick Wins:
- Focus on pricing first (most important)
- Don't worry about perfect data initially
- We can iterate and improve

### Common Patterns in Luxury Sites:
- Often use "Floorplans" or "Availability" pages
- Pricing usually on interactive floor plan tools
- May load data via JavaScript/API
- Often have "Schedule Tour" or "Apply Now" CTAs

### If Stuck:
- Check Network tab (F12 → Network) for API calls
- Look for JSON responses with pricing data
- Some sites fetch data from backend APIs

---

## 🔄 Iterative Process

**Round 1:** Analyze 2-3 sites → Build initial scraper  
**Round 2:** Test → Find issues → Refine  
**Round 3:** Deploy to all 39 → Track success rate  
**Round 4:** Fix failures → Get to 70%+ success  

---

## 📞 Ready to Start?

1. **Pick 2-3 test sites** from the list above
2. **Visit them** in your browser
3. **Use DevTools** to find CSS selectors
4. **Share your findings** (can be rough notes!)
5. **I'll build the scraper** based on your analysis

**Let's unlock those 39 sites!** 🚀

---

## 📁 Files

- Run: `node start_template_training.mjs` (shows this info)
- Guide: `TEMPLATE_TRAINING_GUIDE.md` (this file)
- Summary: `TRAINING_SYSTEM_SUMMARY.md` (full system overview)
