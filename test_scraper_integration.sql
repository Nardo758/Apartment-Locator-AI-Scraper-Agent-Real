-- Test scraper data insertion
INSERT INTO apartments (external_id, source, title, address, city, state, rent_price, bedrooms, bathrooms, square_feet, amenities, free_rent_concessions, scraped_at)
VALUES ('test-001', 'test-source', 'Test Apartment', '123 Main St', 'Atlanta', 'GA', 1500, 2, 2, 1200, '["Pool", "Gym"]', '1 month free', NOW())
ON CONFLICT (external_id) DO UPDATE SET
  rent_price = EXCLUDED.rent_price,
  scraped_at = NOW();

-- Test data retrieval
SELECT external_id, title, rent_price, free_rent_concessions FROM apartments WHERE external_id = 'test-001';