import os
from datetime import datetime, timedelta
from supabase import create_client


class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "https://jdymvpasjsdbryatscux.supabase.co")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not self.key:
            raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is required in environment")
        self.client = create_client(self.url, self.key)

    def upsert_apartment(self, apartment_data: dict):
        """Insert or update apartment data. Uses external_id as conflict key."""
        try:
            data = {
                "external_id": apartment_data.get("external_id"),
                "source": apartment_data.get("source", "unknown"),
                "title": apartment_data.get("title"),
                "address": apartment_data.get("address"),
                "city": apartment_data.get("city"),
                "state": apartment_data.get("state"),
                "zip_code": apartment_data.get("zip_code"),
                "latitude": apartment_data.get("latitude"),
                "longitude": apartment_data.get("longitude"),
                "rent_price": apartment_data.get("rent_price"),
                "bedrooms": apartment_data.get("bedrooms"),
                "bathrooms": apartment_data.get("bathrooms"),
                "square_feet": apartment_data.get("square_feet"),
                "amenities": apartment_data.get("amenities", []),
                "images": apartment_data.get("images", []),
                "is_active": True,
                # include timezone info
                "scraped_at": datetime.utcnow().isoformat() + "Z",
            }

            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}

            # upsert with conflict on external_id so same external_id updates
            resp = self.client.table("apartments").upsert(data, on_conflict="external_id").execute()

            # supabase-py execute() usually returns a dict with 'data' key
            if isinstance(resp, dict):
                rows = resp.get("data")
                if rows:
                    return rows[0]
            # fallback: return raw response
            return resp
        except Exception as e:
            print(f"Error upserting apartment: {e}")
            return None

    def deactivate_old_listings(self, source: str, cutoff_days: int = 7):
        """Mark old listings as inactive. Returns number of rows updated when available."""
        try:
            cutoff_date = (datetime.utcnow() - timedelta(days=cutoff_days)).isoformat() + "Z"
            resp = self.client.table("apartments") \
                .update({"is_active": False}) \
                .eq("source", source) \
                .lt("scraped_at", cutoff_date) \
                .execute()

            if isinstance(resp, dict):
                rows = resp.get("data")
                return len(rows) if rows else 0

            return 0
        except Exception as e:
            print(f"Error deactivating old listings: {e}")
            return 0
