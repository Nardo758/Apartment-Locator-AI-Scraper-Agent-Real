# Live Altitude Atlanta - Site Analysis

## 🔍 Landing Page Analysis

From the HTML Elements screenshot, I can see:

### Site Information:
- **URL**: livealtitudeatlanta.com
- **Technology Stack**: 
  - Knock.io integration (doorway system)
  - Jonah Digital platform
  - Custom JavaScript loaders

### Key Observations:

1. **Navigation Structure**
   ```html
   <div role="navigation" aria-label="Accessibility quick links">
   ```
   - The site has a navigation element
   - Need to see the actual navigation menu items

2. **Page Structure**
   ```html
   <body class="page-homepage" data-new-gr-c-s-check-loaded="14.1260.0">
   ```
   - Currently on homepage
   - Uses custom theme system

3. **Scripts & Data Loading**
   - Uses Jonah Digital CMS: `https://livealtitudeatlanta.com/views/site/js/dist/scripts.min.js`
   - Knock.io integration for tours/scheduling
   - May load pricing data via JavaScript/API

---

## 🎯 Next Steps - What I Need:

### Can you navigate to the Floor Plans page?

Look for these common navigation items:
- "Floor Plans"
- "Availability" 
- "Amenities"
- "Pricing"
- "Residences"
- "Units"

### Once there, share:

1. **The URL** (e.g., livealtitudeatlanta.com/floor-plans)

2. **Screenshot of Elements tab** showing:
   - The pricing information
   - Floor plan cards/listings
   - Bed/bath details

3. **Network tab** (optional but helpful):
   - Press F12 → Network tab
   - Refresh page
   - Look for JSON/API calls
   - Share any that show floor plan data

---

## 🔧 What I'm Looking For:

### Example of what pricing might look like in HTML:

**Option 1: Static HTML**
```html
<div class="floor-plan">
  <h3>One Bedroom A</h3>
  <div class="price">$1,895</div>
  <div class="details">
    <span class="beds">1 Bed</span>
    <span class="baths">1 Bath</span>
    <span class="sqft">650 sq ft</span>
  </div>
</div>
```

**Option 2: JavaScript Loaded (API)**
```javascript
// Network tab might show:
GET /api/floorplans
Response: [
  {
    "name": "One Bedroom A",
    "price": 1895,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 650
  }
]
```

---

## 💡 Quick Instructions:

1. **Find Navigation**: Look at top of page for menu
2. **Click "Floor Plans"** (or similar)
3. **Open Elements tab** (F12 → Elements)
4. **Find a floor plan listing**
5. **Right-click pricing → Inspect**
6. **Share screenshot** of that HTML section

I'll build the scraper based on what you find! 🚀

---

## 🎬 Video Alternative:

If you recorded the navigation in your video, just describe:
- "Clicked Floor Plans in top menu"
- "Saw 5 floor plans with prices like $1,850, $2,100, etc."
- "Each had bed/bath info below pricing"

Any description helps me understand the structure!
