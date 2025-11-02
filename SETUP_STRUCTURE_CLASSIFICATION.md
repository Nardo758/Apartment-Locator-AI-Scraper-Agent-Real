# Website Structure Classification System

## 🎯 Overview

This system groups websites by structure patterns so when you train the scraper on one site, it knows how to scrape all similar sites.

## 📊 Classification Results

**Total Sites:** 99
**Classified:** 66 sites into 4 templates
**Unclassified:** 33 sites (need manual review)

### 🏗️ Structure Templates:

1. **SINGLE-PROPERTY-PREMIUM** (39 sites) 🔥
   - Individual luxury properties with custom branding
   - Examples: livealtitudeatlanta.com, thedagnymidtown.com, novelwestmidtown.com
   - Pattern: Custom branded sites with "live", "the", "at" in domain

2. **PROPERTY-MANAGEMENT-STANDARD** (15 sites) 🔥
   - Large property management companies (AMLI, Cortland, etc.)
   - Examples: amli.com (4 sites), cortland.com (4 sites), bellperimetercenter.com
   - Pattern: Corporate property management with standardized layouts

3. **UNIVERSITY-HOUSING** (6 sites) 🔥
   - University and student housing portals
   - Examples: housing.gatech.edu, offcampushousing.emory.edu
   - Pattern: .edu domains, "housing", "campus", "student" keywords

4. **BOUTIQUE-BUILDER** (6 sites) 🔥
   - Boutique real estate with property search
   - Examples: highrises.com (5 sites), homes.com
   - Pattern: Search/filter interfaces for multiple properties

## 🚀 How It Works

### Training Flow:
```
1. Train on ONE site from template group
   Example: Train on amli.com/site-a
   
2. Scraper learns the structure pattern
   - Where pricing is located
   - How to navigate floor plans
   - CSS selectors for unit data
   
3. Apply learned pattern to ALL sites in group
   amli.com/site-a → Pattern learned
   amli.com/site-b → Uses same pattern ✅
   amli.com/site-c → Uses same pattern ✅
   amli.com/site-d → Uses same pattern ✅
```

### Benefits:
- ✅ **4 templates cover 66% of sites** (66/99)
- ✅ Train once → Scrape 39 sites (single-property-premium)
- ✅ Train once → Scrape 15 sites (property-management)
- ✅ Faster development (group similar structures)
- ✅ Easier maintenance (update template, not 99 individual scrapers)

## 📋 Setup Instructions

### Step 1: Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Copy contents from: create_structure_classification.sql
```

### Step 2: Review Classifications

```bash
node analyze_site_structures.mjs
```

This generates: `site_structure_classification.json`

### Step 3: Training Priority

Train templates in this order (biggest impact first):

1. **single-property-premium** (39 sites)
   - Pick 2-3 sample sites
   - Create template scraper
   - Test on samples
   - Deploy to all 39

2. **property-management-standard** (15 sites)
   - Focus on AMLI (4 sites) and Cortland (4 sites)
   - These have very similar structures

3. **university-housing** (6 sites)
   - University portals often similar
   - Train once for all .edu sites

4. **boutique-builder** (6 sites)
   - highrises.com pattern (5 sites)

## 🎓 Training Approach

### For Each Template:

1. **Analyze Structure** (Manual)
   - Visit 2-3 sample sites
   - Identify common patterns:
     - Where is pricing displayed?
     - How to navigate to unit details?
     - What triggers data loading?
   
2. **Create Template Scraper**
   - Write extraction logic
   - Use CSS selectors or API intercept
   - Add validation rules

3. **Test on Samples**
   - Test on 2-3 sites from group
   - Verify all required fields extracted
   - Check bathroom/bedroom validation

4. **Deploy to Group**
   - Apply template to all sites in group
   - Track success rate
   - Mark as "trained" in learning queue

## 📁 Files Created

1. **create_structure_classification.sql** - Database schema
2. **analyze_site_structures.mjs** - Classification script
3. **site_structure_classification.json** - Classification results
4. **SETUP_STRUCTURE_CLASSIFICATION.md** - This guide

## 📊 Database Tables

### `website_structure_templates`
Stores template patterns (single-property-premium, property-management, etc.)

### `site_classifications`
Maps each site to a template with confidence score

### `template_performance`
Tracks how well each template performs

## 🎯 Expected Results

With 4 templates covering 66 sites:
- **39 sites** from single template (single-property-premium)
- **15 sites** from one template (property-management)
- **6 sites** from university template
- **6 sites** from boutique template

**Total: Train 4 patterns → Scrape 66 sites** 🚀

That's **16.5 sites per template** on average!
