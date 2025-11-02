#!/usr/bin/env python3
"""
Clean aggregator data and scrape ONLY individual property websites
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'agents'))

from rental_data_agent import RentalDataAgent
from dotenv import load_dotenv
from supabase import create_client

env_file = Path(__file__).parent / '.env.production.real'
load_dotenv(env_file, override=True)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Aggregator sites to exclude
AGGREGATORS = [
    'apartments.com', 'zillow.com', 'trulia.com', 'realtor.com',
    'apartmentguide.com', 'rent.com', 'forrent.com', 'apartmentlist.com',
    'rentcafe.com', 'yelp.com', 'reddit.com', 'redfin.com'
]

print('\nCleaning and Scraping Individual Properties Only')
print('=' * 70)
print(f'Database: {SUPABASE_URL}\n')

async def clean_aggregator_data():
    """Delete scraped data from aggregator sites"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print('Step 1: Cleaning aggregator data...\n')
    
    # Get all scraped properties
    response = supabase.table('scraped_properties').select('id, listing_url, name').execute()
    
    if not response.data:
        print('   No scraped data found')
        return 0
    
    # Find aggregator records
    aggregator_ids = []
    for prop in response.data:
        url = prop['listing_url'].lower()
        if any(agg in url for agg in AGGREGATORS):
            aggregator_ids.append(prop['id'])
            print(f'   [DELETE] {prop["name"]}: {url[:60]}...')
    
    if aggregator_ids:
        # Delete in batches
        for i in range(0, len(aggregator_ids), 50):
            batch = aggregator_ids[i:i+50]
            supabase.table('scraped_properties').delete().in_('id', batch).execute()
        
        print(f'\n   Deleted {len(aggregator_ids)} aggregator records\n')
        return len(aggregator_ids)
    else:
        print('   No aggregator records to delete\n')
        return 0

async def get_individual_properties():
    """Get only individual property websites (not aggregators)"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get all sources
    sources_response = supabase.table('property_sources').select('*').execute()
    
    if not sources_response.data:
        return []
    
    # Get scraped URLs
    scraped_response = supabase.table('scraped_properties').select('listing_url').execute()
    scraped_urls = set()
    if scraped_response.data:
        scraped_urls = {prop['listing_url'] for prop in scraped_response.data}
    
    # Filter: individual properties, not aggregators, not yet scraped
    individual_unscraped = []
    for source in sources_response.data:
        url = source['url'].lower()
        is_aggregator = any(agg in url for agg in AGGREGATORS)
        is_scraped = source['url'] in scraped_urls
        
        if not is_aggregator and not is_scraped:
            individual_unscraped.append(source)
    
    return individual_unscraped

async def store_rental_data(rental_data_list, source_url):
    """Store rental data with validation"""
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
            'property_id': f'ind_{timestamp}',
            'unit_number': getattr(data, 'floorplan_name', 'N/A')[:50],
            'source': source_url[:255],
            'name': property_name[:100],
            'address': 'Atlanta Area',
            'city': 'Atlanta',
            'state': 'GA',
            'listing_url': source_url[:500],
        }
        
        # Price validation
        if hasattr(data, 'monthly_rent') and data.monthly_rent:
            price_str = str(data.monthly_rent).replace('$', '').replace(',', '').strip()
            if '-' in price_str:
                price_str = price_str.split('-')[0].strip()
            try:
                price = int(float(price_str))
                if 100 <= price <= 50000:
                    record['current_price'] = price
                else:
                    record['current_price'] = 0
            except (ValueError, TypeError):
                record['current_price'] = 0
        else:
            record['current_price'] = 0
        
        # Square feet
        if hasattr(data, 'sqft') and data.sqft:
            try:
                sqft = int(float(data.sqft))
                if 100 <= sqft <= 10000:
                    record['square_feet'] = sqft
            except (ValueError, TypeError):
                pass
        
        # Bedrooms (validate)
        if hasattr(data, 'bedrooms') and data.bedrooms is not None:
            try:
                beds = int(data.bedrooms)
                if 0 <= beds <= 10:
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
        print(f'      [ERROR] {str(e)[:80]}')
        return False

async def main():
    """Main function"""
    
    # Step 1: Clean aggregator data
    deleted = await clean_aggregator_data()
    
    # Step 2: Get individual properties
    print('Step 2: Finding individual properties to scrape...\n')
    properties = await get_individual_properties()
    
    if not properties:
        print('No individual properties to scrape!')
        return
    
    print(f'Found {len(properties)} individual properties\n')
    print('=' * 70)
    print('Step 3: Scraping individual properties\n')
    
    agent = RentalDataAgent()
    successful = 0
    failed = 0
    
    async with agent:
        for idx, prop in enumerate(properties[:50], 1):  # Limit to 50 for now
            url = prop['url']
            name = prop['property_name'][:40]
            
            print(f'[{idx}/{min(len(properties), 50)}] {name}')
            
            try:
                rental_data = await agent.extract_rental_data(url, property_id=prop.get('property_name', url))
                
                if rental_data and len(rental_data) > 0:
                    stored = await store_rental_data(rental_data, url)
                    
                    if stored:
                        print(f'   [OK] {len(rental_data)} unit(s) -> Production')
                        successful += 1
                    else:
                        print(f'   [FAIL] Save failed')
                        failed += 1
                else:
                    print('   [SKIP] No data')
                    failed += 1
                    
            except Exception as e:
                print(f'   [ERROR] {str(e)[:50]}')
                failed += 1
    
    print('\n' + '=' * 70)
    print(f'\nComplete!')
    print(f'   Aggregator records deleted: {deleted}')
    print(f'   Individual properties scraped: {successful}')
    print(f'   Failed: {failed}')
    print(f'   Cost: ~${successful * 0.15:.2f}\n')

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n\nInterrupted')
        sys.exit(0)
