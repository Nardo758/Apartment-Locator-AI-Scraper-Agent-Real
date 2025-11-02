-- Website Structure Classification System
-- Groups websites by similar structure patterns for efficient scraper training

-- 1. Structure Templates Table
CREATE TABLE IF NOT EXISTS website_structure_templates (
    id BIGSERIAL PRIMARY KEY,
    template_name TEXT NOT NULL UNIQUE,
    description TEXT,
    technology_stack TEXT[], -- ['react', 'angular', 'wordpress', 'custom']
    layout_pattern TEXT, -- 'grid-list', 'carousel', 'table', 'cards'
    pricing_location TEXT, -- 'hero', 'sidebar', 'modal', 'table'
    unit_selector TEXT, -- 'dropdown', 'filter', 'search', 'links'
    data_source TEXT, -- 'static', 'api', 'iframe', 'pdf'
    common_css_patterns JSONB, -- Common CSS selectors
    common_url_patterns TEXT[], -- URL structure patterns
    extraction_strategy TEXT, -- 'css-selectors', 'api-intercept', 'vision', 'hybrid'
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    sample_sites TEXT[], -- Example sites using this template
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Site Classification Table
CREATE TABLE IF NOT EXISTS site_classifications (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    template_id BIGINT REFERENCES website_structure_templates(id),
    confidence_score DECIMAL(5,2), -- How confident we are in the classification
    structure_analysis JSONB, -- Detailed structure info
    has_floor_plans BOOLEAN,
    has_availability BOOLEAN,
    has_pricing BOOLEAN,
    has_amenities BOOLEAN,
    requires_interaction BOOLEAN, -- Does it need clicks/forms?
    bot_protection TEXT, -- 'none', 'recaptcha', 'cloudflare', 'custom'
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Template Performance Tracking
CREATE TABLE IF NOT EXISTS template_performance (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT REFERENCES website_structure_templates(id),
    site_url TEXT NOT NULL,
    scrape_date TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    fields_extracted JSONB, -- Which fields were successfully extracted
    extraction_time_ms INT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_class_domain ON site_classifications(domain);
CREATE INDEX IF NOT EXISTS idx_site_class_template ON site_classifications(template_id);
CREATE INDEX IF NOT EXISTS idx_template_perf_template ON template_performance(template_id);
CREATE INDEX IF NOT EXISTS idx_template_perf_success ON template_performance(success);

-- Insert common template patterns
INSERT INTO website_structure_templates (
    template_name, 
    description, 
    layout_pattern,
    extraction_strategy,
    sample_sites
) VALUES 
    ('property-management-standard', 'Standard property management site with floor plans page', 'grid-list', 'css-selectors', ARRAY['amli.com', 'cortland.com', 'equityapartments.com']),
    ('listing-aggregator', 'Aggregator site with multiple properties', 'cards', 'api-intercept', ARRAY['apartments.com', 'zillow.com', 'trulia.com']),
    ('single-property-basic', 'Basic single property site', 'hero', 'css-selectors', ARRAY['piedmonthouseapts.com', 'moderamidtown.com']),
    ('interactive-builder', 'Requires filtering/selection before pricing', 'modal', 'hybrid', ARRAY['highrises.com', 'rentcafe.com']),
    ('university-housing', 'University/student housing portal', 'table', 'css-selectors', ARRAY['housing.gatech.edu', 'offcampushousing.emory.edu'])
ON CONFLICT (template_name) DO NOTHING;

-- Grants
GRANT ALL ON website_structure_templates TO service_role, anon, authenticated;
GRANT ALL ON site_classifications TO service_role, anon, authenticated;
GRANT ALL ON template_performance TO service_role, anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, anon, authenticated;

COMMENT ON TABLE website_structure_templates IS 'Template patterns for different website structures - train once, apply to many';
COMMENT ON TABLE site_classifications IS 'Classification of each site to a structure template';
COMMENT ON TABLE template_performance IS 'Track how well each template performs on different sites';
