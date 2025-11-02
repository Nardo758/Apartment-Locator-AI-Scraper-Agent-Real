#!/usr/bin/env python3
"""
Scrape properties and save directly to PRODUCTION Supabase
Uses .env.production.real for credentials
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'agents'))

from rental_data_agent import RentalDataAgent
from dotenv import load_dotenv
from supabase import create_client

# IMPORTANT: Load production credentials
env_file = Path(__file__).parent / '.env.production.real'
if env_file.exists():
    print(f'Loading PRODUCTION config from: {env_file}')
    load_dotenv(env_file, override=True)
else:
    print('ERROR: .env.production.real not found!')
    sys.exit(1)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_KEY:
    raise ValueError('SUPABASE_SERVICE_ROLE_KEY not found in .env.production.real')

print(f'\nDatabase: {SUPABASE_URL}')
print(f'Key: {SUPABASE_KEY[:20]}...')

# Verify we're using production
if 'localhost' in SUPABASE_URL or '127.0.0.1' in SUPABASE_URL:
    print('\nERROR: Still pointing to local database!')
    print('Update .env.production.real with production URL')
    sys.exit(1)

print('\nScraping to PRODUCTION Supabase\n')
print('=' * 70)

async def get_unscraped_urls():
    """Get URLs from production that haven't been scraped yet"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get all property sources
    sources_response = supabase.table('property_sources')\
        .select('*')\
        .order('priority', desc=True)\
        .execute()
    
    if not sources_response.data:
        return []
    
    # Get all scraped URLs
    scraped_response = supabase.table('scraped_properties')\
        .select('listing_url')\
        .execute()
    
    scraped_urls = set()
    if scraped_response.data:
        scraped_urls = {prop['listing_url'] for prop in scraped_response.data}
    
    # Filter to only unscraped URLs
    unscraped = [source for source in sources_response.data if source['url'] not in scraped_urls]
    
    return unscraped

async def store_rental_data(rental_data_list, source_url):
    """Store extracted rental data to scraped_properties table"""
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
        print(f'   [SUCCESS] Saved to PRODUCTION database')
        return True
    except Exception as e:
        print(f'   [ERROR] Failed to save: {str(e)}')
        return False

async def process_properties():
    """Main processing function"""
    
    properties = await get_unscraped_urls()
    
    if not properties:
        print('All URLs in production have been scraped!')
        return
    
    print(f'\nFound {len(properties)} unscraped URLs in production\n')
    for idx, prop in enumerate(properties, 1):
        print(f'{idx}. {prop["property_name"]} - {prop["url"]}')
    
    print('\n' + '=' * 70 + '\n')
    
    agent = RentalDataAgent()
    
    successful = 0
    failed = 0
    
    async with agent:
        for idx, prop in enumerate(properties, 1):
            url = prop['url']
            
            print(f'\n[{idx}/{len(properties)}] Processing: {prop["property_name"]}')
            print(f'   URL: {url}')
            
            try:
                rental_data = await agent.extract_rental_data(url, property_id=prop.get('property_name', url))
                
                if rental_data and len(rental_data) > 0:
                    print(f'   [OK] Extracted {len(rental_data)} units')
                    
                    stored = await store_rental_data(rental_data, url)
                    
                    if stored:
                        successful += 1
                    else:
                        failed += 1
                else:
                    print(f'   [FAIL] No data extracted')
                    failed += 1
                    
            except Exception as e:
                error_msg = str(e)
                print(f'   [ERROR] {error_msg[:100]}')
                failed += 1
                continue
    
    print('\n' + '=' * 70)
    print('\nProcessing Complete!\n')
    print(f'   Successful: {successful}')
    print(f'   Failed: {failed}')
    if len(properties) > 0:
        print(f'   Success Rate: {(successful / len(properties) * 100):.1f}%')
    
    print(f'\n   All data saved to PRODUCTION: {SUPABASE_URL}')
    print(f'\n   Estimated Cost: ~${successful * 0.15:.2f}\n')

if __name__ == '__main__':
    try:
        asyncio.run(process_properties())
    except KeyboardInterrupt:
        print('\n\nInterrupted by user')
        sys.exit(1)
    except Exception as e:
        print(f'\nFatal error: {str(e)}')
        sys.exit(1)
