#!/usr/bin/env python3
"""
Scrape ALL remaining properties in production queue
Runs in continuous batches until queue is empty
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent / 'agents'))

from rental_data_agent import RentalDataAgent
from dotenv import load_dotenv
from supabase import create_client

# Load production credentials
env_file = Path(__file__).parent / '.env.production.real'
if env_file.exists():
    load_dotenv(env_file, override=True)
else:
    print('ERROR: .env.production.real not found!')
    sys.exit(1)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if 'localhost' in SUPABASE_URL or '127.0.0.1' in SUPABASE_URL:
    print('\nERROR: Still pointing to local database!')
    sys.exit(1)

print(f'\nScraping ALL Remaining Properties to Production')
print(f'Database: {SUPABASE_URL}')
print('=' * 70)

BATCH_SIZE = 25
MAX_BATCHES = 100  # Safety limit

async def get_unscraped_batch(limit):
    """Get next batch of unscraped properties"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    sources_response = supabase.table('property_sources')\
        .select('*')\
        .order('priority', desc=True)\
        .execute()
    
    if not sources_response.data:
        return []
    
    scraped_response = supabase.table('scraped_properties')\
        .select('listing_url')\
        .execute()
    
    scraped_urls = set()
    if scraped_response.data:
        scraped_urls = {prop['listing_url'] for prop in scraped_response.data}
    
    unscraped = [s for s in sources_response.data if s['url'] not in scraped_urls]
    return unscraped[:limit]

async def store_rental_data(rental_data_list, source_url):
    """Store rental data with better error handling"""
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
            'property_id': f'prod_{timestamp}',
            'unit_number': getattr(data, 'floorplan_name', 'N/A')[:50],
            'source': source_url[:255],
            'name': property_name[:100],
            'address': 'Atlanta Area',
            'city': 'Atlanta',
            'state': 'GA',
            'listing_url': source_url[:500],
        }
        
        # Price
        has_price = False
        if hasattr(data, 'monthly_rent') and data.monthly_rent:
            price_str = str(data.monthly_rent).replace('$', '').replace(',', '').strip()
            if '-' in price_str:
                price_str = price_str.split('-')[0].strip()
            try:
                price = int(float(price_str))
                if 100 <= price <= 50000:  # Reasonable range
                    record['current_price'] = price
                    has_price = True
            except (ValueError, TypeError):
                pass
        
        if not has_price:
            record['current_price'] = 0
            
        # Square feet
        if hasattr(data, 'sqft') and data.sqft:
            try:
                sqft = int(float(data.sqft))
                if 100 <= sqft <= 10000:  # Reasonable range
                    record['square_feet'] = sqft
            except (ValueError, TypeError):
                pass
                
        # Bedrooms
        if hasattr(data, 'bedrooms') and data.bedrooms is not None:
            try:
                beds = int(data.bedrooms)
                if 0 <= beds <= 10:  # Reasonable range
                    record['bedrooms'] = beds
            except (ValueError, TypeError):
                pass
                
        # Bathrooms (validate - max 3)
        if hasattr(data, 'bathrooms') and data.bathrooms is not None:
            try:
                baths = float(data.bathrooms)
                if 0 <= baths <= 3:  # VALIDATION: Max 3 bathrooms
                    record['bathrooms'] = baths
                else:
                    print(f'      [SKIP] Invalid bathrooms: {baths}')
            except (ValueError, TypeError):
                pass
        
        records.append(record)
    
    try:
        supabase.table('scraped_properties').insert(records).execute()
        return True
    except Exception as e:
        error_msg = str(e)
        if len(error_msg) > 100:
            error_msg = error_msg[:100] + '...'
        print(f'      [Save Error: {error_msg}]')
        return False

async def scrape_batch(batch_num, properties):
    """Scrape one batch"""
    
    print(f'\n{"="*70}')
    print(f'BATCH {batch_num} - Processing {len(properties)} properties')
    print(f'{"="*70}\n')
    
    agent = RentalDataAgent()
    successful = 0
    failed = 0
    
    async with agent:
        for idx, prop in enumerate(properties, 1):
            url = prop['url']
            name = prop['property_name'][:40]
            
            print(f'[{idx}/{len(properties)}] {name}')
            
            try:
                rental_data = await agent.extract_rental_data(url, property_id=prop.get('property_name', url))
                
                if rental_data and len(rental_data) > 0:
                    stored = await store_rental_data(rental_data, url)
                    
                    if stored:
                        print(f'   [OK] Success: {len(rental_data)} unit(s) -> Production')
                        successful += 1
                    else:
                        print(f'   [WARN] Extracted {len(rental_data)} but save failed')
                        failed += 1
                else:
                    print('   [FAIL] No data extracted')
                    failed += 1
                    
            except Exception as e:
                print(f'   [ERROR] {str(e)[:60]}')
                failed += 1
    
    return successful, failed

async def main():
    """Main scraping loop"""
    
    total_successful = 0
    total_failed = 0
    batch_num = 0
    
    start_time = datetime.now()
    
    print('\nStarting continuous scraping...\n')
    
    while batch_num < MAX_BATCHES:
        batch_num += 1
        
        # Get next batch
        properties = await get_unscraped_batch(BATCH_SIZE)
        
        if not properties:
            print('\n' + '='*70)
            print('[COMPLETE] ALL PROPERTIES SCRAPED!')
            print('='*70)
            break
        
        # Scrape batch
        successful, failed = await scrape_batch(batch_num, properties)
        
        total_successful += successful
        total_failed += failed
        
        # Progress summary
        elapsed = (datetime.now() - start_time).total_seconds()
        rate = total_successful / (elapsed / 60) if elapsed > 0 else 0
        
        print(f'\nProgress:')
        print(f'   Batch {batch_num} complete: {successful} success, {failed} failed')
        print(f'   Total: {total_successful} success, {total_failed} failed')
        print(f'   Rate: {rate:.1f} properties/minute')
        print(f'   Elapsed: {int(elapsed/60)}m {int(elapsed%60)}s')
        
        # Short pause between batches
        if properties:
            print(f'\n   Pausing 2 seconds before next batch...\n')
            await asyncio.sleep(2)
    
    # Final summary
    elapsed = (datetime.now() - start_time).total_seconds()
    
    print('\n' + '='*70)
    print('[SUCCESS] SCRAPING COMPLETE!')
    print('='*70)
    print(f'\nFinal Stats:')
    print(f'   Batches processed: {batch_num}')
    print(f'   Successful: {total_successful}')
    print(f'   Failed: {total_failed}')
    print(f'   Success rate: {(total_successful/(total_successful+total_failed)*100):.1f}%')
    print(f'   Total time: {int(elapsed/60)}m {int(elapsed%60)}s')
    print(f'   Average: {rate:.1f} properties/minute')
    print(f'\nEstimated cost: ~${total_successful * 0.15:.2f}')
    print(f'\nDatabase: {SUPABASE_URL}\n')

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n\n[INTERRUPTED] Stopped by user')
        print('Progress has been saved to production database.')
        print('Run again to continue where you left off.\n')
        sys.exit(0)
    except Exception as e:
        print(f'\n[FATAL ERROR] {str(e)}')
        sys.exit(1)
