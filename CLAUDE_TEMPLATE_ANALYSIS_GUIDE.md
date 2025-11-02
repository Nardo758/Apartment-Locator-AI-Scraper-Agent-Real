# 🤖 Using Claude to Improve Template Detection

Since you have experience with Claude, you can manually analyze the unclassified sites to discover new patterns!

## 📊 Current Situation

- **66 sites classified** (67%) into 4 templates
- **33 sites unclassified** (33%) - need analysis

## 🎯 Goal

Analyze the 33 unclassified sites to:
1. Find new common patterns
2. Create additional templates
3. Increase classification from 67% → 90%+

## 📋 Unclassified Sites to Analyze

Run this to get the list:
```bash
node view_learning_queue.mjs
```

Or query directly:
```sql
SELECT domain, url, property_name
FROM scraper_learning_queue
WHERE url NOT IN (SELECT url FROM site_classifications)
ORDER BY domain;
```

## 🤔 Analysis Questions for Claude

Copy the unclassified sites list and ask Claude:

```
I have these 33 property/apartment websites that need classification:

[PASTE LIST HERE]

Currently classified patterns:
1. single-property-premium (39 sites) - Individual luxury properties with custom branding
2. property-management-standard (15 sites) - Large property management companies (AMLI, Cortland)
3. university-housing (6 sites) - University and student housing portals
4. boutique-builder (6 sites) - Boutique real estate with property search

Questions:
1. Which unclassified sites fit into existing templates?
2. Do you see 2-3 new common patterns that justify new templates?
3. What characteristics define each new pattern?
4. Which sites would belong to each new pattern?

For new patterns, suggest:
- Template name
- Description
- Extraction strategy hints
- List of sites that fit this pattern
```

## 💡 Common New Patterns to Look For

### Pattern 1: Corporate Portfolios
- Multi-property developers with standardized sites
- Examples: Venterra, Mill Creek, Post Properties
- Usually have `/properties/` or `/apartments/` structure

### Pattern 2: Local Management Companies
- Smaller local property managers
- Custom sites but simpler structure
- Examples: Simpson Property Group, Smart City Locating

### Pattern 3: Luxury High-Rise Specialists
- Focus on high-rise/condo rentals
- Different from standard apartments
- Examples: Highrises.com, Homes.com

### Pattern 4: Furnished/Corporate Housing
- Furnished apartments for corporate clients
- Different pricing model (monthly vs yearly)
- Examples: Sentral, Blueground, Synergy Housing

### Pattern 5: Vacation/Short-Term Rentals
- Short-term rental focus
- Different from traditional apartments
- Examples: James Edition (luxury rentals)

## 🔄 Process After Claude Analysis

### Step 1: Create New Templates

Based on Claude's suggestions, add new templates:

```sql
INSERT INTO website_structure_templates (
    template_name, 
    description, 
    layout_pattern,
    extraction_strategy,
    sample_sites
) VALUES 
    ('your-new-template-name', 
     'Description from Claude analysis', 
     'grid-list',  -- or 'cards', 'hero', 'table'
     'css-selectors',  -- or 'api-intercept', 'hybrid'
     ARRAY['site1.com', 'site2.com', 'site3.com']);
```

### Step 2: Re-run Classification

```bash
node analyze_site_structures.mjs
node populate_site_classifications.mjs
```

### Step 3: Verify Improvement

```bash
node view_training_roadmap.mjs
```

Expected: Classification rate increases from 67% → 85%+

## 📈 Expected Impact

If Claude identifies 3 new patterns covering 20 more sites:
- **Before:** 66/99 classified (67%)
- **After:** 86/99 classified (87%)
- **Remaining:** 13 truly unique sites (13%)

## 🎓 Benefits

1. **Better Coverage:** 87% vs 67% classified
2. **More Efficient:** Train 7 templates instead of building 99 scrapers
3. **Clearer Patterns:** Understand website landscape better
4. **Easier Training:** Group similar sites for batch training

## 📝 Template

Here's the exact prompt to use with Claude:

```markdown
I'm building a property scraper and need to classify websites by structure.

## Unclassified Sites (33):
[Paste from: node view_learning_queue.mjs]

## Existing Templates (4):
1. single-property-premium (39 sites) - Custom branded luxury apartments
2. property-management-standard (15 sites) - AMLI, Cortland, etc.
3. university-housing (6 sites) - .edu housing portals
4. boutique-builder (6 sites) - Property search sites

## Task:
1. Group unclassified sites by common structure patterns
2. Suggest 2-3 new templates if patterns emerge
3. For each new template provide:
   - Name (kebab-case)
   - Description
   - Which sites fit (list domains)
   - Common characteristics
   - Extraction hints

Focus on patterns with 3+ sites for efficiency.
```

## 🚀 Next Steps

1. Get unclassified list: `node view_learning_queue.mjs`
2. Ask Claude to analyze patterns
3. Create new templates based on Claude's recommendations
4. Re-run classification
5. Check improvement in coverage

**Goal:** Get to 85%+ classified before starting training!
