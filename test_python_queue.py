from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path
import os

# Load production environment
load_dotenv(Path('.env.production.real'), override=True)

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print(f'URL: {url}')
print(f'Key: {key[:30]}...\n')

client = create_client(url, key)

# Test 1: Get all rows
print('Test 1: Get all rows')
resp1 = client.table('scraping_queue').select('id, url, status').execute()
print(f'Total rows: {len(resp1.data)}')
print(f'Sample statuses: {set(d["status"] for d in resp1.data[:20])}\n')

# Test 2: Get queued rows
print('Test 2: Get queued rows')
resp2 = client.table('scraping_queue').select('id, url, status').eq('status', 'queued').execute()
print(f'Queued rows: {len(resp2.data)}')
if resp2.data:
    for d in resp2.data:
        print(f'  ID {d["id"]}: {d["status"]} - {d["url"][:50]}')
else:
    print('  No data returned')

# Test 3: Get IDs 3-6 specifically
print('\nTest 3: Get IDs 3-6 specifically')
resp3 = client.table('scraping_queue').select('id, url, status').in_('id', [3, 4, 5, 6]).execute()
print(f'Found {len(resp3.data)} rows')
for d in resp3.data:
    print(f'  ID {d["id"]}: status="{d["status"]}" (type: {type(d["status"]).__name__})')
