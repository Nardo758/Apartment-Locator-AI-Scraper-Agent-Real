# System Architecture

- Edge Functions structure
- Database schema (see supabase/migrations)
- API endpoints

Flow:
1. `scraper-orchestrator` schedules jobs and pushes to `scrape_jobs`.
2. `ai-scraper-worker` fetches pages and extracts structured data via OpenAI.
3. Results are stored in `ai_results` and `scraped_properties`.
