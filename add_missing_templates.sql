-- Add missing structure templates

INSERT INTO website_structure_templates (
    template_name, 
    description, 
    layout_pattern,
    pricing_location,
    extraction_strategy,
    sample_sites
) VALUES 
    (
        'single-property-premium', 
        'Individual luxury properties with custom branding (live*, the*, at*)', 
        'hero',
        'hero',
        'css-selectors',
        ARRAY['livealtitudeatlanta.com', 'thedagnymidtown.com', 'novelwestmidtown.com', 'thejunipermidtown.com', 'liveascentmidtown.com']
    ),
    (
        'boutique-builder', 
        'Boutique real estate sites with property search/filter', 
        'cards',
        'modal',
        'hybrid',
        ARRAY['highrises.com', 'homes.com']
    )
ON CONFLICT (template_name) DO UPDATE SET
    description = EXCLUDED.description,
    sample_sites = EXCLUDED.sample_sites,
    updated_at = NOW();

-- Verify all templates exist
SELECT template_name, description, array_length(sample_sites, 1) as sample_count
FROM website_structure_templates
ORDER BY template_name;
