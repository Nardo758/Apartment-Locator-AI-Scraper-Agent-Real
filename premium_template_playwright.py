"""
Premium Template Scraper with Playwright
Handles interactive flow: Lease Now → Floor Plans → Unit Selection → Availability → Pricing
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import re
from supabase import create_client
import os
from dotenv import load_dotenv
import time

load_dotenv('.env.production.real')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def scrape_premium_interactive(url, headless=True):
    """
    Scrape using interactive navigation flow
    """
    print(f"\n{'='*70}")
    print(f"[INTERACTIVE SCRAPE] {url}")
    print(f"{'='*70}")
    
    results = {
        'property_name': None,
        'pricing': None,
        'lease_term': 12,
        'bedrooms': None,
        'bathrooms': None,
        'sqft': None,
        'units': []
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()
        
        try:
            # Step 1: Load homepage
            print(f"[STEP 1] Loading homepage...")
            page.goto(url, wait_until='networkidle', timeout=30000)
            time.sleep(2)
            
            # Handle cookie consent if present
            try:
                cookie_button = page.locator('text=I Agree').first
                if cookie_button.is_visible(timeout=2000):
                    print(f"   Accepting cookies...")
                    cookie_button.click()
                    time.sleep(1)
            except:
                pass
            
            # Get property name from title
            results['property_name'] = page.title().split('|')[0].strip()
            print(f"   Property: {results['property_name']}")
            
            # Take initial screenshot
            page.screenshot(path='debug_initial.png')
            print("[DEBUG] Initial page screenshot: debug_initial.png")
            
            # Step 2: Try clicking top-right area to open menu
            print(f"[STEP 2] Opening navigation menu...")
            menu_opened = False
            
            # Try clicking the X button area in top-right (visible in screenshot)
            try:
                print("   Trying to click top-right X button area...")
                # Click in the top-right corner where X button should be
                page.mouse.click(1235, 40)  # X button location from screenshot
                time.sleep(2)
                page.screenshot(path='debug_after_click.png')
                print("[DEBUG] After click screenshot: debug_after_click.png")
                menu_opened = True
            except Exception as e:
                print(f"   Direct click failed: {e}")
            
            # Also try finding button programmatically
            if not menu_opened:
                try:
                    # Look for any button in top-right area
                    all_buttons = page.locator('button').all()
                    print(f"   Found {len(all_buttons)} total buttons on page")
                    # Try clicking buttons near top-right
                    for i, btn in enumerate(all_buttons[:10]):
                        try:
                            box = btn.bounding_box()
                            if box and box['x'] > 1100:  # Right side of screen
                                print(f"   Clicking button #{i} at x={box['x']}")
                                btn.click()
                                time.sleep(2)
                                menu_opened = True
                                break
                        except:
                            continue
                except Exception as e:
                    print(f"   Button search error: {e}")
            
            # Step 3: Now click Floorplans link
            print(f"[STEP 3] Clicking 'Floorplans' link...")
            clicked = False
            try:
                floorplans_link = page.get_by_text("Floorplans", exact=True).first
                print("   Waiting for Floorplans link to become visible...")
                floorplans_link.wait_for(state="visible", timeout=5000)
                print("   Clicking Floorplans...")
                floorplans_link.click()
                time.sleep(5)  # Wait for floor plans page to load
                clicked = True
                print("   Successfully navigated to Floor Plans")
            except Exception as e:
                print(f"   Floorplans click failed: {e}")
            
            if not clicked:
                print("[WARN] Could not navigate to Floor Plans page")
            
            # Step 4: Scroll down to reveal floor plan units
            print(f"[STEP 4] Scrolling to reveal floor plan units...")
            try:
                # Scroll down the page to load floor plans
                for i in range(3):
                    page.mouse.wheel(0, 500)
                    time.sleep(1)
                print("   Scrolled down to reveal units")
            except Exception as e:
                print(f"   Scroll error: {e}")
            
            # Step 5: Look for floor plan listings
            print(f"[STEP 5] Looking for floor plan units...")
            
            unit_selectors = [
                '[class*="floorplan"]',
                '.floor-plan',
                '.floorplan',
                '[class*="unit-card"]',
                '[class*="residence"]'
            ]
            
            units_found = None
            for selector in unit_selectors:
                try:
                    units = page.locator(selector).all()
                    if len(units) > 0:
                        print(f"   Found {len(units)} units using selector: {selector}")
                        units_found = units
                        break
                except:
                    continue
            
            # Step 6: Click first unit to see pricing
            print(f"[STEP 6] Selecting first available unit...")
            
            unit_clicked = False
            if units_found and len(units_found) > 0:
                try:
                    # Try clicking the first unit
                    first_unit = units_found[0]
                    print(f"   Clicking first floor plan unit...")
                    first_unit.click()
                    time.sleep(3)
                    unit_clicked = True
                except Exception as e:
                    print(f"   Unit click failed: {e}")
            
            # If unit click didn't work, try finding availability button
            if not unit_clicked:
                clickable_elements = [
                    'button:has-text("Check Availability")',
                    'button:has-text("View Details")',
                    'button:has-text("Select")',
                    'a:has-text("Availability")',
                    '.btn'
                ]
                
                for selector in clickable_elements:
                    try:
                        element = page.locator(selector).first
                        if element.is_visible(timeout=1000):
                            print(f"   Clicking: {selector}")
                            element.click()
                            time.sleep(3)
                            unit_clicked = True
                            break
                    except:
                        continue
            
            # Step 7: Look for lease term selector and select 12 months
            print(f"[STEP 7] Looking for lease term options...")
            
            lease_term_selectors = [
                'text=12 months Lease',
                'text=12 month',
                'text=12 months',
                '[value="12"]',
                'button:has-text("12")'
            ]
            
            for selector in lease_term_selectors:
                try:
                    option = page.locator(selector).first
                    if option.is_visible(timeout=2000):
                        print(f"   Found 12-month lease option")
                        option.click()
                        time.sleep(3)
                        break
                except:
                    continue
            
            # Step 8: Extract all visible pricing from current page
            print(f"[STEP 8] Extracting pricing from current page...")
            
            # Scroll down more to ensure pricing is loaded
            try:
                page.mouse.wheel(0, 500)
                time.sleep(2)
            except:
                pass
            
            text_content = page.inner_text('body')
            
            # Look for pricing patterns
            price_pattern = r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
            all_prices = re.findall(price_pattern, text_content)
            
            if all_prices:
                prices = [float(p.replace(',', '')) for p in all_prices]
                reasonable_prices = [p for p in prices if 500 <= p <= 10000]
                
                if reasonable_prices:
                    # Look specifically for 12-month lease pricing
                    lease_12_match = re.search(r'12\s*months?.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text_content, re.I | re.DOTALL)
                    if lease_12_match:
                        results['pricing'] = float(lease_12_match.group(1).replace(',', ''))
                        results['lease_term'] = 12
                        print(f"   [SUCCESS] Found 12-month pricing: ${results['pricing']}")
                    else:
                        # Get the lowest price (most common starting price)
                        results['pricing'] = min(reasonable_prices)
                        print(f"   [INFO] Found pricing: ${results['pricing']}")
                
                    # Also collect multiple prices for range
                    if len(reasonable_prices) > 1:
                        print(f"   Price range: ${min(reasonable_prices)} - ${max(reasonable_prices)}")
            
            # Extract bed/bath info
            bed_bath_pattern = r'(\d+)\s*bed(?:room)?s?\s*[|,/]?\s*(\d+)\s*bath(?:room)?s?'
            match = re.search(bed_bath_pattern, text_content, re.I)
            if match:
                results['bedrooms'] = int(match.group(1))
                results['bathrooms'] = int(match.group(2))
                print(f"   Bed/Bath: {results['bedrooms']}BR / {results['bathrooms']}BA")
            
            # Extract square footage
            sqft_match = re.search(r'(\d{1,4})\s*(?:sq\.?\s*ft|sqft|square\s*feet)', text_content, re.I)
            if sqft_match:
                results['sqft'] = int(sqft_match.group(1))
                print(f"   Sqft: {results['sqft']}")
            
            # Take final screenshot
            page.screenshot(path='premium_scrape_debug.png')
            print("[DEBUG] Final screenshot: premium_scrape_debug.png")
            
        except Exception as e:
            print(f"[ERROR] {str(e)}")
        
        finally:
            browser.close()
    
    # Validation
    if results['bathrooms'] and results['bathrooms'] > 3:
        print(f"[FAIL] Bathrooms={results['bathrooms']} exceeds limit")
        return None
    
    if results['pricing']:
        print(f"\n[SUCCESS] Extracted pricing: ${results['pricing']}")
    else:
        print(f"\n[WARN] No pricing found")
    
    return results

def save_to_database(url, data):
    """Save to Supabase"""
    if not data or not data['pricing']:
        return False
    
    try:
        property_data = {
            'url': url,
            'property_name': data['property_name'],
            'rent_min': data['pricing'],
            'rent_max': data['pricing'],
            'bedrooms': data['bedrooms'],
            'bathrooms': data['bathrooms'],
            'sqft_min': data['sqft'],
            'sqft_max': data['sqft'],
            'lease_term_months': data['lease_term'],
            'scraper_template': 'single-property-premium-interactive'
        }
        
        result = supabase.table('scraped_properties').upsert(property_data).execute()
        print(f"[SAVED] Saved to database!")
        return True
    except Exception as e:
        print(f"[ERROR] Database: {str(e)}")
        return False

if __name__ == "__main__":
    # Test URL
    test_url = 'https://livealtitudeatlanta.com/'
    
    print("\n[TRAINING] Testing Interactive Premium Scraper")
    print("="*70)
    print("\nNOTE: Browser will open in non-headless mode for debugging")
    print("You can watch the automation steps...\n")
    
    # Run with visible browser for first test
    data = scrape_premium_interactive(test_url, headless=False)
    
    if data and data['pricing']:
        print(f"\n[SUCCESS] Found pricing: ${data['pricing']}")
        save_to_database(test_url, data)
    else:
        print(f"\n[FAIL] Could not extract pricing")
        print("Check premium_scrape_debug.png to see where we ended up")
