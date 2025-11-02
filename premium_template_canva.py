"""
Premium Template Scraper - Canva Iframe Version
Handles sites with Canva-embedded floor plans
"""

from playwright.sync_api import sync_playwright
import re
from supabase import create_client
import os
from dotenv import load_dotenv
import time

load_dotenv('.env.production.real')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def scrape_with_canva_iframe(url, headless=False):
    """
    Scrape sites that use Canva embedded floor plans
    """
    print(f"\n{'='*70}")
    print(f"[SCRAPING] {url}")
    print(f"{'='*70}")
    
    results = {
        'property_name': None,
        'pricing': [],
        'lease_terms': [],
        'units': []
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()
        
        try:
            # Load homepage
            print(f"[STEP 1] Loading homepage...")
            page.goto(url, wait_until='networkidle', timeout=30000)
            time.sleep(2)
            
            # Accept cookies
            try:
                page.locator('text=I Agree').first.click(timeout=2000)
                time.sleep(1)
            except:
                pass
            
            results['property_name'] = page.title().split('|')[0].strip()
            print(f"   Property: {results['property_name']}")
            
            # Open menu and click Floorplans
            print(f"[STEP 2] Navigating to Floor Plans...")
            try:
                # Click hamburger menu (three lines) in top right
                print("   Looking for hamburger menu...")
                
                # Try to find and click the hamburger menu icon
                hamburger_found = False
                hamburger_selectors = [
                    'button.navigation__toggle',
                    '.navigation__toggle',
                    'button[class*="navigation"][class*="toggle"]',
                    'svg[class*="hamburger"]',
                ]
                
                for selector in hamburger_selectors:
                    try:
                        btn = page.locator(selector).first
                        if btn.is_visible(timeout=1000):
                            print(f"   Found hamburger: {selector}")
                            btn.click()
                            time.sleep(3)
                            hamburger_found = True
                            break
                    except:
                        continue
                
                # If not found, try clicking the hamburger icon position
                if not hamburger_found:
                    print("   Clicking hamburger icon position (top-right)...")
                    page.mouse.click(1220, 40)  # Hamburger menu position
                    time.sleep(3)
                
                # Now click Floorplans - should be visible
                print("   Clicking Floorplans link...")
                floorplans_link = page.get_by_text("Floorplans", exact=True).first
                floorplans_link.wait_for(state="visible", timeout=10000)
                floorplans_link.click()
                time.sleep(5)
                print("   Successfully navigated to Floor Plans page")
            except Exception as e:
                print(f"   Navigation failed: {e}")
                print("   Taking screenshot for debug...")
                page.screenshot(path='nav_fail_debug.png')
                browser.close()
                return None
            
            # Look for Canva iframe
            print(f"[STEP 3] Looking for Canva iframe...")
            try:
                # Find iframe containing canva.com
                iframes = page.frames
                canva_frame = None
                
                for frame in iframes:
                    if 'canva.com' in frame.url:
                        canva_frame = frame
                        print(f"   Found Canva iframe: {frame.url[:80]}...")
                        break
                
                if canva_frame:
                    # Extract content from Canva iframe
                    print(f"[STEP 4] Extracting data from Canva iframe...")
                    time.sleep(3)  # Let iframe fully load
                    
                    try:
                        iframe_text = canva_frame.inner_text('body')
                        
                        # Extract all prices
                        prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', iframe_text)
                        if prices:
                            price_floats = [float(p.replace(',', '')) for p in prices]
                            reasonable = [p for p in price_floats if 500 <= p <= 10000]
                            results['pricing'] = reasonable
                            print(f"   Found {len(reasonable)} prices: ${min(reasonable)} - ${max(reasonable)}")
                            
                            # Look for 12-month lease
                            if '12 month' in iframe_text.lower():
                                lease_12_match = re.search(r'12\s*months?.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', iframe_text, re.I)
                                if lease_12_match:
                                    main_price = float(lease_12_match.group(1).replace(',', ''))
                                    print(f"   [SUCCESS] 12-month lease: ${main_price}")
                                    results['pricing'] = [main_price]
                        
                        # Extract bed/bath
                        bed_bath = re.findall(r'(\d+)\s*bed(?:room)?s?\s*[|,/]?\s*(\d+)\s*bath', iframe_text, re.I)
                        if bed_bath:
                            print(f"   Found bed/bath configs: {bed_bath}")
                        
                        # Extract sqft
                        sqft = re.findall(r'(\d{1,4})\s*(?:sq\.?\s*ft|sqft)', iframe_text, re.I)
                        if sqft:
                            print(f"   Found sqft: {sqft}")
                            
                    except Exception as e:
                        print(f"   Iframe extraction error: {e}")
                        
                else:
                    print("   [WARN] No Canva iframe found")
                    
            except Exception as e:
                print(f"   Iframe search error: {e}")
            
            # Take final screenshot
            page.screenshot(path='canva_scrape_result.png', full_page=True)
            print("[DEBUG] Screenshot saved: canva_scrape_result.png")
            
        except Exception as e:
            print(f"[ERROR] {str(e)}")
        
        finally:
            browser.close()
    
    # Validation
    if results['pricing']:
        if any(500 <= p <= 10000 for p in results['pricing']):
            best_price = min(results['pricing'])
            print(f"\n[SUCCESS] Best price found: ${best_price}")
            return {
                'property_name': results['property_name'],
                'pricing': best_price,
                'all_prices': results['pricing']
            }
    
    print(f"\n[FAIL] No valid pricing found")
    return None

def save_to_database(url, data):
    """Save to Supabase"""
    if not data or not data.get('pricing'):
        return False
    
    try:
        property_data = {
            'url': url,
            'property_name': data['property_name'],
            'rent_min': data['pricing'],
            'rent_max': max(data.get('all_prices', [data['pricing']])),
            'scraper_template': 'single-property-premium-canva'
        }
        
        result = supabase.table('scraped_properties').upsert(property_data).execute()
        print(f"[SAVED] Saved to database!")
        return True
    except Exception as e:
        print(f"[ERROR] Database: {str(e)}")
        return False

if __name__ == "__main__":
    test_url = 'https://livealtitudeatlanta.com/'
    
    print("\n[TRAINING] Testing Canva Iframe Scraper")
    print("="*70)
    print("\nDiscovery: Floor plans are embedded in Canva iframe!")
    print("This scraper will extract pricing from the Canva embed.\n")
    
    data = scrape_with_canva_iframe(test_url, headless=False)
    
    if data:
        print(f"\n[SUCCESS] Extracted: ${data['pricing']}")
        save_to_database(test_url, data)
    else:
        print(f"\n[FAIL] Could not extract pricing")
