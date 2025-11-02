"""
Watch and Learn Mode
Opens browser and tracks your navigation to learn the flow
"""

from playwright.sync_api import sync_playwright
import time
import os

def watch_navigation(url):
    """
    Open browser and let user navigate while we track the journey
    """
    print("\n" + "="*70)
    print("WATCH AND LEARN MODE")
    print("="*70)
    print("\nI'll open the browser and watch what you do.")
    print("Navigate through the site to find pricing, and I'll track your path.\n")
    print("Steps to follow:")
    print("  1. Accept cookies if prompted")
    print("  2. Navigate to Floor Plans")
    print("  3. Select a unit")
    print("  4. Find the pricing page with lease terms")
    print("  5. Look at the $1,808 pricing you mentioned\n")
    print("When done, just close the browser window.\n")
    print("="*70)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        navigation_log = []
        click_log = []
        
        # Track navigation
        def log_navigation(frame):
            url = frame.url
            navigation_log.append({
                'url': url,
                'title': page.title(),
                'timestamp': time.time()
            })
            print(f"\n[NAV] Navigated to: {url}")
            print(f"      Title: {page.title()}")
        
        # Track clicks
        def log_click(request):
            if request.method in ['GET', 'POST']:
                print(f"[ACTION] {request.method}: {request.url}")
        
        page.on('framenavigated', log_navigation)
        page.on('request', log_click)
        
        # Load the starting page
        print(f"\n[START] Loading {url}...")
        page.goto(url)
        
        print("\n" + "="*70)
        print("BROWSER IS OPEN - Do your navigation now!")
        print("I'm watching and learning...")
        print("\n*** OFF SWITCHES (choose one): ***")
        print("  1. Close the browser window")
        print("  2. Press CTRL+C in this terminal")
        print("  3. Create a file called 'stop.txt' in this folder")
        print("="*70 + "\n")
        
        # Keep browser open and watch
        last_url = url
        try:
            # Check if browser is still open
            while not page.is_closed():
                time.sleep(1)
                
                # Check for stop signal (file-based off switch)
                if os.path.exists('stop.txt'):
                    print("\n[STOP] stop.txt detected - ending session...")
                    os.remove('stop.txt')
                    break
                
                try:
                    # Check current URL
                    current_url = page.url
                    current_title = page.title()
                    
                    # Log when URL changes
                    if current_url != last_url:
                        print(f"\n[PAGE CHANGE] {current_url}")
                        print(f"              Title: {current_title}")
                        last_url = current_url
                    
                    # Look for keywords in URL/title that indicate we found pricing
                    if any(word in current_url.lower() for word in ['floor', 'plan', 'availab', 'pric', 'lease']):
                        if current_url not in navigation_log or len(navigation_log) == 0:
                            print(f"\n[LEARNING] You're on a relevant page!")
                            print(f"           URL: {current_url}")
                            
                            # Try to extract any visible pricing
                            try:
                                page_text = page.inner_text('body')
                                if '$' in page_text:
                                    # Find dollar amounts
                                    import re
                                    prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', page_text)
                                    reasonable = [p for p in prices if any(char.isdigit() for char in p)]
                                    if reasonable:
                                        print(f"           Found prices: {reasonable[:5]}")  # Show first 5
                                        
                                    # Look for lease terms
                                    if '12 month' in page_text.lower():
                                        print(f"           [!] Found '12 month' lease term on page!")
                                        
                            except:
                                pass
                except:
                    # Browser might be closed
                    break
                
        except KeyboardInterrupt:
            print("\n\n" + "="*70)
            print("LEARNING SESSION ENDED (Keyboard Interrupt)")
            print("="*70)
        except Exception as e:
            print(f"\n[INFO] Browser closed or session ended: {e}")
            
        # Summary
        print(f"\n\nNAVIGATION SUMMARY:")
        print("="*70)
        for i, nav in enumerate(navigation_log, 1):
            print(f"\n{i}. {nav['url']}")
            print(f"   Title: {nav['title']}")
        
        print("\n\n" + "="*70)
        print("ANALYSIS COMPLETE")
        print("="*70)
        print("\nBased on what I observed, I can now build a scraper that follows")
        print("the exact same navigation path you just showed me!")
        print("\nKey things I learned:")
        print(f"  - Total pages visited: {len(navigation_log)}")
        print(f"  - Navigation depth: {len(set(n['url'] for n in navigation_log))}")
        
        browser.close()

if __name__ == "__main__":
    url = 'https://livealtitudeatlanta.com/'
    
    print("\n" + "="*70)
    print("INTERACTIVE LEARNING SESSION")
    print("="*70)
    print(f"\nTarget: {url}")
    print("\nI will open the browser and watch your navigation.")
    print("Show me the exact steps to get to the pricing!")
    print("\nStarting in 3 seconds...")
    time.sleep(3)
    
    watch_navigation(url)
