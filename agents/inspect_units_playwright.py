from playwright.sync_api import sync_playwright
import time
from pathlib import Path


def main():
    url = "https://highlandsatsweetwatercreek.com/floorplans/"
    out_root = Path(__file__).resolve().parent / 'live_results' / 'https_highlandsatsweetwatercreek_com_'
    out_root.mkdir(parents=True, exist_ok=True)
    out_file = out_root / 'units_inspect.txt'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(url)

        try:
            page.wait_for_selector('[data-unit]', timeout=10000)
        except Exception:
            page.wait_for_timeout(2000)

        unit_elements = page.query_selector_all('[data-unit]')

        lines = []
        lines.append(f'Found {len(unit_elements)} unit elements')

        for i, unit in enumerate(unit_elements):
            lines.append('\n--- Unit %d ---' % (i+1))
            try:
                text = unit.inner_text()
            except Exception:
                text = ''
            lines.append('Visible text: ' + (text.strip()[:100].replace('\n', ' ') + '...'))
            try:
                html = unit.inner_html()
            except Exception:
                html = ''
            lines.append('HTML snippet: ' + (html[:500].replace('\n', ' ') + '...'))

            if '$' in html:
                lines.append('✅ Contains $ symbol')
            if 'price' in html.lower():
                lines.append("✅ Contains 'price' text")

        # Test clicking first unit
        lines.append('\nTesting click on first unit...')
        if unit_elements:
            try:
                unit_elements[0].click()
                page.wait_for_timeout(2000)
                modal = page.query_selector('.modal, [role="dialog"], .popup, .unit-details, .floorplan-modal')
                if modal:
                    lines.append('✅ Modal appeared after click')
                    try:
                        modal_text = modal.inner_text()
                    except Exception:
                        modal_text = ''
                    lines.append('Modal content: ' + (modal_text[:500].replace('\n', ' ') + '...'))
                else:
                    lines.append('❌ No modal found after click')
            except Exception as e:
                lines.append('Click failed: ' + str(e))

        # Save output
        out_file.write_text('\n'.join(lines), encoding='utf-8')
        print('Wrote inspection output to', out_file)
        browser.close()


if __name__ == '__main__':
    main()
from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("https://highlandsatsweetwatercreek.com/floorplans/")
        
        # Wait for page to load
        try:
            page.wait_for_selector('[data-unit]', timeout=10000)
        except Exception:
            print('No [data-unit] selector found within timeout')
        
        # Get all unit elements and inspect their content
        unit_elements = page.query_selector_all('[data-unit]')
        print(f"Found {len(unit_elements)} unit elements")
        
        for i, unit in enumerate(unit_elements):
            print(f"\n--- Unit {i+1} ---")
            # Get visible text content
            try:
                text = unit.inner_text()
                print(f"Visible text: {text.strip()[:200]}...")
            except Exception:
                print('Could not read visible text')
            
            # Get inner HTML to see structure
            try:
                html = unit.inner_html()
                print(f"HTML snippet: {html[:300]}...")
            except Exception:
                print('Could not read inner HTML')
            
            # Look for common price patterns in the HTML
            try:
                if '$' in html:
                    print("✅ Contains $ symbol")
                if 'price' in html.lower():
                    print("✅ Contains 'price' text")
            except Exception:
                pass
        
        # Also check if clicking reveals more data
        print("\nTesting if clicks reveal modal data...")
        if unit_elements:
            try:
                unit_elements[0].click()
                time.sleep(2)
                
                # Check for modals or expanded content
                modal = page.query_selector('.modal, [role="dialog"], .popup')
                if modal:
                    print("✅ Modal appeared after click")
                    modal_text = modal.inner_text()
                    print(f"Modal content: {modal_text[:300]}...")
                else:
                    print("❌ No modal found after click")
            except Exception as e:
                print('Click test failed:', e)
        
        browser.close()

if __name__ == '__main__':
    main()
