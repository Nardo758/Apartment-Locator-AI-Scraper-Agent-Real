"""
Single-Property-Premium Template Scraper
For luxury apartment websites (live*, the*, at* domains)
Focuses on 12-month lease pricing
"""

import requests
from bs4 import BeautifulSoup
import re
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv('.env.production.real')

# Supabase connection
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def extract_pricing(html_content, url):
    """
    Extract pricing from single-property-premium sites
    Priority: 12-month lease rate
    Fallback: Shortest available lease term
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Pattern 1: Look for lease term selectors with pricing
    # Common patterns: "12 months Lease", "$1,808.00*"
    
    pricing_patterns = [
        # Pattern for lease term + price structure
        {'lease': re.compile(r'12\s*months?\s*lease', re.I), 'price': re.compile(r'\$[\d,]+\.?\d*')},
        {'lease': re.compile(r'12\s*mo', re.I), 'price': re.compile(r'\$[\d,]+\.?\d*')},
        
        # Direct pricing selectors (common class names)
        {'selector': '.lease-price'},
        {'selector': '.pricing'},
        {'selector': '.price-amount'},
        {'selector': '.rent-price'},
        {'selector': '[class*="price"]'},
    ]
    
    results = {
        'pricing': None,
        'lease_term': None,
        'bedrooms': None,
        'bathrooms': None,
        'sqft': None,
        'property_name': None
    }
    
    # Extract property name from title or h1
    title = soup.find('title')
    h1 = soup.find('h1')
    if title:
        results['property_name'] = title.text.strip().split('|')[0].strip()
    elif h1:
        results['property_name'] = h1.text.strip()
    
    # Try to find pricing with 12-month lease
    text_content = soup.get_text()
    
    # Look for "12 months Lease" followed by price
    lease_12_pattern = re.search(r'12\s*months?\s*lease.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text_content, re.I | re.DOTALL)
    if lease_12_pattern:
        results['pricing'] = float(lease_12_pattern.group(1).replace(',', ''))
        results['lease_term'] = 12
        print(f"Found 12-month lease pricing: ${results['pricing']}")
    
    # Fallback: Look for any pricing
    if not results['pricing']:
        all_prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text_content)
        if all_prices:
            # Convert to floats and filter reasonable range
            prices = [float(p.replace(',', '')) for p in all_prices]
            reasonable_prices = [p for p in prices if 500 <= p <= 10000]
            if reasonable_prices:
                results['pricing'] = min(reasonable_prices)  # Take lowest price
                print(f"Found pricing (fallback): ${results['pricing']}")
    
    # Extract bed/bath info
    bed_bath_patterns = [
        r'(\d+)\s*bed(?:room)?s?\s*[|,]?\s*(\d+)\s*bath(?:room)?s?',
        r'(\d+)BR\s*/\s*(\d+)BA',
        r'(\d+)\s*bd\s*[|,]?\s*(\d+)\s*ba',
    ]
    
    for pattern in bed_bath_patterns:
        match = re.search(pattern, text_content, re.I)
        if match:
            results['bedrooms'] = int(match.group(1))
            results['bathrooms'] = int(match.group(2))
            break
    
    # Extract square footage
    sqft_match = re.search(r'(\d{1,4})\s*(?:sq\.?\s*ft|sqft|square\s*feet)', text_content, re.I)
    if sqft_match:
        results['sqft'] = int(sqft_match.group(1))
    
    return results

def scrape_premium_property(url):
    """
    Scrape a single-property-premium site
    """
    print(f"\n{'='*70}")
    print(f"Scraping: {url}")
    print(f"{'='*70}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        results = extract_pricing(response.text, url)
        
        # Validation
        if results['bathrooms'] and results['bathrooms'] > 3:
            print(f"[FAIL] VALIDATION FAILED: Bathrooms={results['bathrooms']} (max 3 allowed)")
            return None
        
        if results['bedrooms'] and results['bedrooms'] > 10:
            print(f"[FAIL] VALIDATION FAILED: Bedrooms={results['bedrooms']} (max 10 allowed)")
            return None
        
        if results['pricing']:
            if not (500 <= results['pricing'] <= 10000):
                print(f"[FAIL] VALIDATION FAILED: Price=${results['pricing']} (must be $500-$10,000)")
                return None
        
        # Print results
        print(f"\n[OK] Successfully extracted:")
        print(f"   Property: {results['property_name']}")
        print(f"   Pricing: ${results['pricing']}")
        print(f"   Lease Term: {results['lease_term']} months")
        print(f"   Bed/Bath: {results['bedrooms']}BR / {results['bathrooms']}BA")
        print(f"   Sqft: {results['sqft']}")
        
        return results
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return None

def save_to_database(url, data):
    """
    Save scraped data to Supabase
    """
    if not data or not data['pricing']:
        print("[WARN] No pricing data to save")
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
            'scraper_template': 'single-property-premium'
        }
        
        result = supabase.table('scraped_properties').upsert(property_data).execute()
        print(f"[SAVED] Saved to database!")
        return True
        
    except Exception as e:
        print(f"[ERROR] Database error: {str(e)}")
        return False

# Test on sample sites
if __name__ == "__main__":
    test_urls = [
        'https://livealtitudeatlanta.com/',
        'https://www.thedagnymidtown.com/the-dagny-atlanta-ga',
        'https://www.novelwestmidtown.com/'
    ]
    
    print("\n[TRAINING] Testing Premium Template Scraper\n")
    print("="*70)
    
    success_count = 0
    for url in test_urls:
        data = scrape_premium_property(url)
        if data and data['pricing']:
            if save_to_database(url, data):
                success_count += 1
    
    print(f"\n{'='*70}")
    print(f"\n[RESULTS] {success_count}/{len(test_urls)} successful")
    print(f"   Success Rate: {(success_count/len(test_urls)*100):.1f}%\n")
