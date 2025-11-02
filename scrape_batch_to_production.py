#!/usr/bin/env python3
"""
Batch scrape properties to production in manageable chunks
Processes properties in batches with progress tracking
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'agents'))

from rental_data_agent import RentalDataAgent
from dotenv import load_dotenv
from supabase import create_client

# Load production credentials
env_file = Path(__file__).parent / '.env.production.real'
if env_file.exists():
    print(f'Loading PRODUCTION config from: {env_file}')
    load_dotenv(env_file, override=True)
else:
    print('ERROR: .env.production.real not found!')
    sys.exit(1)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if 'localhost' in SUPABASE_URL or '127.0.0.1' in SUPABASE_URL:
    print('\nERROR: Still pointing to local database!')
    sys.exit(1)

print(f'\nScraping to PRODUCTION: {SUPABASE_URL}')
print('=' * 70)

# Configuration
BATCH_SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 20
print(f'Batch size: {BATCH_SIZE} properties\n')

async def get_unscraped_batch(limit):
    """Get a batch of unscraped URLs"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get property sources
    sources_response = supabase.table('property_sources')\
        .select('*')\
        .order('priority', desc=True)\
        .limit(limit * 3)\
        .execute()
    
    if not sources_response.data:
        return []
    
    # Get scraped URLs
    scraped_response = supabase.table('scraped_properties')\
        .select('listing_url')\
        .execute()
    
    scraped_urls = set()
    if scraped_response.data:
        scraped_urls = {prop['listing_url'] for prop in scraped_response.data}
    
    # Filter unscraped, limit batch size
    unscraped = [s for s in sources_response.data if s['url'] not in scraped_urls]
    return unscraped[:limit]

async def store_rental_data(rental_data_list, source_url):
    """Store extracted rental data"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    if not rental_data_list:
        return False
    
    from urllib.parse import urlparse
    parsed = urlparse(source_url)
    property_name = parsed.netloc.replace('www.', '').split('.')[0].title()
    
    records = []
    for data in rental_data_list:
        timestamp = int(asyncio.get_event_loop().time() * 1000)
        
        record = {
            'property_id': f'vision_scraped_{timestamp}',
            'unit_number': getattr(data, 'floorplan_name', 'Unknown'),
            'source': source_url,
            'name': property_name,
            'address': 'Vision Extracted',
            'city': 'Atlanta',
            'state': 'GA',
            'listing_url': source_url,
        }
        
        has_price = False
        if hasattr(data, 'monthly_rent') and data.monthly_rent:
            price_str = str(data.monthly_rent).replace('$', '').replace(',', '').strip()
            if '-' in price_str:
                price_str = price_str.split('-')[0].strip()
            try:
                record['current_price'] = int(float(price_str))
                has_price = True
            except (ValueError, TypeError):
                pass
        
        if not has_price:
            record['current_price'] = 0
        if hasattr(data, 'sqft') and data.sqft:
            try:
                record['square_feet'] = int(float(data.sqft))
            except (ValueError, TypeError):
                pass
        if hasattr(data, 'bedrooms') and data.bedrooms is not None:
            try:
                record['bedrooms'] = int(data.bedrooms)
            except (ValueError, TypeError):
                pass
        # Bathrooms (validate - max 3)
        if hasattr(data, 'bathrooms') and data.bathrooms is not None:
            try:
                baths = int(data.bathrooms) if data.bathrooms == int(data.bathrooms) else float(data.bathrooms)
                if 0 <= baths <= 3:  # VALIDATION: Max 3 bathrooms
                    record['bathrooms'] = baths
                else:
                    print(f'      [SKIP] Invalid bathrooms: {baths}')
            except (ValueError, TypeError):
                pass
        
        records.append(record)
    
    try:
        response = supabase.table('scraped_properties').insert(records).execute()
        return True
    except Exception as e:
        print(f'   [ERROR] Save failed: {str(e)[:100]}')
        return False

async def process_batch():
    """Process one batch of properties"""
    
    properties = await get_unscraped_batch(BATCH_SIZE)
    
    if not properties:
        print('\nAll properties in queue have been scraped!')
        return False
    
    print(f'Processing batch of {len(properties)} properties\n')
    
    agent = RentalDataAgent()
    
    successful = 0
    failed = 0
    
    async with agent:
        for idx, prop in enumerate(properties, 1):
            url = prop['url']
            
            print(f'[{idx}/{len(properties)}] {prop["property_name"][:50]}')
            print(f'   {url[:70]}...')
            
            try:
                rental_data = await agent.extract_rental_data(url, property_id=prop.get('property_name', url))
                
                if rental_data and len(rental_data) > 0:
                    print(f'   -> Extracted {len(rental_data)} units', end='')
                    
                    stored = await store_rental_data(rental_data, url)
                    
                    if stored:
                        print(' -> Saved to production')
                        successful += 1
                    else:
                        print(' -> Save failed')
                        failed += 1
                else:
                    print('   -> No data extracted')
                    failed += 1
                    
            except Exception as e:
                print(f'   -> Error: {str(e)[:80]}')
                failed += 1
                continue
    
    print('\n' + '=' * 70)
    print(f'\nBatch Complete: {successful} successful, {failed} failed')
    print(f'Estimated cost: ~${successful * 0.15:.2f}\n')
    
    return True

if __name__ == '__main__':
    try:
        asyncio.run(process_batch())
    except KeyboardInterrupt:
        print('\n\nInterrupted by user')
        sys.exit(0)
    except Exception as e:
        print(f'\nFatal error: {str(e)}')
        sys.exit(1)
