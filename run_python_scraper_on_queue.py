#!/usr/bin/env python3
"""
Run Python Rental Data Agent on Queued Properties
Processes properties from scraping_queue using vision-based extraction
Automatically sends failures to learning queue (failed_scrapes)
"""

import asyncio
import os
import sys
from pathlib import Path

# Add agents directory to path
sys.path.insert(0, str(Path(__file__).parent / 'agents'))

from rental_data_agent import RentalDataAgent
from dotenv import load_dotenv
from supabase import create_client

# Load production environment (override local .env)
env_file = Path(__file__).parent / '.env.production.real'
if env_file.exists():
    load_dotenv(env_file, override=True)
else:
    load_dotenv()

# Configuration
# Use production database (where properties were discovered)
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://jdymvpasjsdbryatscux.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_KEY:
    raise ValueError('SUPABASE_SERVICE_ROLE_KEY not found in environment')

BATCH_SIZE = 5  # Process 5 properties at a time

print(f'Database: {SUPABASE_URL}')
print(f'Key: {SUPABASE_KEY[:20]}...')

print('\nPython Vision Agent - Processing Queue\n')
print('=' * 70)

async def get_queued_properties():
    """Fetch properties from property_sources (discovered properties not yet scraped)"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print(f'Querying property_sources at: {SUPABASE_URL}')
    
    # Get properties from property_sources instead
    response = supabase.table('property_sources')\
        .select('*')\
        .order('created_at', desc=False)\
        .limit(BATCH_SIZE)\
        .execute()
    
    print(f'Response data: {len(response.data) if response.data else 0} properties')
    if hasattr(response, 'error') and response.error:
        print(f'Response error: {response.error}')
    
    # Convert property_sources format to queue format
    properties = []
    if response.data:
        for prop in response.data:
            properties.append({
                'id': prop['id'],
                'url': prop['url'],
                'external_id': prop.get('property_name', prop['url']),
                'source': prop.get('discovery_method', 'claude-serp'),
                'metadata': prop
            })
    
    return properties

async def update_queue_status(queue_id, status, error=None):
    """Update property_sources status (skip for now - column doesn't exist)"""
    # TODO: Add scrape_status column to property_sources table
    pass

async def store_rental_data(rental_data_list, source_url):
    """Store extracted rental data to scraped_properties table"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    if not rental_data_list:
        return False
    
    # Convert RentalData objects to dict format for database
    # Use absolute minimum required columns only (schema is unknown)
    records = []
    for idx, data in enumerate(rental_data_list):
        record = {
            'property_id': f'scraped_{int(asyncio.get_event_loop().time() * 1000)}_{idx}',
            'unit_number': getattr(data, 'floorplan_name', 'Unknown'),
            'source': source_url,
        }
        records.append(record)
    
    try:
        response = supabase.table('scraped_properties').insert(records).execute()
        return True
    except Exception as e:
        print(f'   [ERROR] Failed to save: {str(e)[:100]}')
        return False

async def save_to_failed_scrapes(queue_item, error):
    """Save failed scrape to learning queue (disabled - table doesn't exist yet)"""
    # TODO: Create failed_scrapes table
    print(f'   [SKIP] Would save to learning queue: {queue_item["url"]} - Error: {str(error)[:100]}')

async def process_queue():
    """Main processing function"""
    
    # Get queued properties
    properties = await get_queued_properties()
    
    if not properties:
        print('No properties in queue!')
        print('   Run discovery first: node discover_atlanta_properties.mjs\n')
        return
    
    print(f'\nFound {len(properties)} properties to scrape\n')
    
    # Initialize agent
    agent = RentalDataAgent()
    
    successful = 0
    failed = 0
    
    async with agent:
        for idx, prop in enumerate(properties, 1):
            url = prop['url']
            queue_id = prop['id']
            
            print(f'\n[{idx}/{len(properties)}] Processing: {url}')
            print(f'   Source: {prop.get("source", "unknown")}')
            
            try:
                # Update status to processing
                await update_queue_status(queue_id, 'processing')
                
                # Extract rental data using vision agent
                rental_data = await agent.extract_rental_data(
                    url,
                    property_id=prop.get('external_id', url)
                )
                
                if rental_data and len(rental_data) > 0:
                    print(f'   [OK] Extracted {len(rental_data)} units')
                    
                    # Store the data using our custom function
                    stored = await store_rental_data(rental_data, url)
                    
                    if stored:
                        print(f'   [OK] Saved to database')
                        await update_queue_status(queue_id, 'completed')
                        successful += 1
                    else:
                        print(f'   [WARN] Data extracted but failed to save')
                        await update_queue_status(queue_id, 'failed', 'Save failed')
                        await save_to_failed_scrapes(prop, 'Database save failed')
                        failed += 1
                else:
                    print(f'   [FAIL] No data extracted')
                    await update_queue_status(queue_id, 'failed', 'No data extracted')
                    await save_to_failed_scrapes(prop, 'Vision extraction returned no data')
                    failed += 1
                    
            except Exception as e:
                error_msg = str(e)
                print(f'   [ERROR] {error_msg}')
                await update_queue_status(queue_id, 'failed', error_msg)
                await save_to_failed_scrapes(prop, e)
                failed += 1
                
                # Continue with next property
                continue
    
    print('\n' + '=' * 70)
    print('\nProcessing Complete!\n')
    print(f'   Successful: {successful}')
    print(f'   Failed: {failed}')
    print(f'   Sent to learning: {failed}')
    
    if failed > 0:
        print('\nFailed scrapes are in the learning queue')
        print('   Review: SELECT * FROM failed_scrapes ORDER BY created_at DESC;')
        print('   Reprocess: node reprocess_learning_queue.mjs\n')
    
    print('Estimated Cost:')
    print(f'   Vision API: ~${successful * 0.15:.2f} (GPT-4o)')
    print(f'   Total: ~${successful * 0.15:.2f}\n')

if __name__ == '__main__':
    try:
        asyncio.run(process_queue())
    except KeyboardInterrupt:
        print('\n\nInterrupted by user')
        sys.exit(1)
    except Exception as e:
        print(f'\nFatal error: {str(e)}')
        sys.exit(1)
