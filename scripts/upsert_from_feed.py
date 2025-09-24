from database.supabase_client import SupabaseClient


def scrape_apartments():
    """Placeholder scraper function. Replace with real scraping logic.
    Returns a list of dicts representing apartments.
    """
    # Example data; replace with your actual scraping output
    return [
        {
            "external_id": "example-1",
            "source": "example_feed",
            "title": "1BR Apartment",
            "address": "123 Main St",
            "city": "Springfield",
            "state": "IL",
            "zip_code": "62701",
            "rent_price": 1200,
            "bedrooms": 1,
            "bathrooms": 1,
            "square_feet": 600,
            "amenities": ["dishwasher", "air_conditioning"],
            "images": [],
        }
    ]


def main():
    supabase = SupabaseClient()

    apartments = scrape_apartments()

    for apt in apartments:
        row = supabase.upsert_apartment(apt)
        print("Upserted:", row)

    # Clean up old listings
    updated = supabase.deactivate_old_listings("example_feed", cutoff_days=14)
    print(f"Deactivated {updated} old listings")


if __name__ == "__main__":
    main()
