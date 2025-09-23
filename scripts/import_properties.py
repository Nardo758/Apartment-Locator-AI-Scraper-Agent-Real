# Bulk import script for apartment URLs
import requests
import json

def bulk_import_urls(urls, supabase_url, service_role_key):
    headers = {"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}", "Content-Type": "application/json"}
    rows = [{"external_id": u.split('/')[-1], "source": "imported", "listing_url": u} for u in urls]
    res = requests.post(f"{supabase_url}/rest/v1/scraped_properties", headers=headers, json=rows)
    return res

if __name__ == '__main__':
    print('Run bulk_import_urls(urls, SUPABASE_URL, SERVICE_ROLE_KEY) from a Python REPL')
