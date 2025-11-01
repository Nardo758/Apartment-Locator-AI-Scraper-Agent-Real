-- Check what's in the scraping queue
SELECT 
    id,
    url,
    source,
    status,
    property_source_id,
    created_at
FROM scraping_queue 
WHERE status = 'queued'
ORDER BY created_at DESC
LIMIT 10;

-- Count by status
SELECT status, COUNT(*) as count
FROM scraping_queue
GROUP BY status;
