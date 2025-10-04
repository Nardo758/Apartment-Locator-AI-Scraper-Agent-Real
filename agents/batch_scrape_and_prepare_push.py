#!/usr/bin/env python3
import json
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright_js_interactor import interact_detailed_sync

THIS_DIR = Path(__file__).resolve().parent
OUT_DIR = THIS_DIR / 'batch_results'
OUT_DIR.mkdir(exist_ok=True)

# Broad list of container selectors to try (in order)
CONTAINER_CANDIDATES = [
    'div[id^="fp-container-"]',
    'div.fp-container',
    'div[class*="floorplan"]',
    'section[class*="floorplans"]',
    'div[class*="floor-plans"]',
    'div[class*="floorplan-list"]',
    'div[class*="floorPlan"]',
    'main',
]

# element selectors to attempt inside the container
ELEMENT_SELECTORS = ['a.track-apply','a.floorplan-action-button','a[data-selenium-id^="floorplan-"]','a.btn-primary','a[href*="apply"]']

SITES = [
    'https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center',
    'https://www.amli.com/apartments/atlanta/midtown-apartments',
    'https://atlantichousemidtown.com',
    'https://www.hubatl.com',
    'https://www.kineticmidtown.com',
    'https://lillimidtown.com',
    'https://miraatlanta.com',
    'https://novelmidtownatl.com',
    'https://www.piedmonthouseatlanta.com',
    'https://sentral.com/atlanta/west-midtown',
    'https://www.themarkatlanta.com',
    'https://www.themixapts.com',
    'https://www.residencesatchastain.com',
    'https://www.windsoratmidtown.com',
    'https://www.1000midtown.com',
    'https://www.broadstone2thirty.com',
    'https://www.centennialplaceapts.com',
    'https://www.collectiveupperwestside.com',
    'https://www.thegraceresidences.com',
    'https://www.thestandardatl.com',
    'https://www.vuemidtown.com',
    'https://www.novelwestmidtown.com',
    'https://www.westmarstudentlofts.com',
    'https://www.arizonalofts.com',
    'https://www.porterwestside.com',
    'https://www.exchangewestend.com',
    'https://www.altaporteron peachtree.com',
    'https://cortland.com/apartments/atlanta-metro/cortland-brookhaven',
    'https://www.maac.com/georgia/atlanta/maa-brookhaven',
    'https://www.postbrookhaven.com',
    'https://www.reservebrookhaven.com',
]


def slug_for_url(url: str) -> str:
    u = urlparse(url)
    slug = (u.netloc + u.path).replace('/', '_').replace('.', '_')
    return slug.strip('_')


def run_site(url: str, headless: bool = True, timeout: int = 15000):
    # try container candidates until one yields a result
    last_error = None
    for c in CONTAINER_CANDIDATES:
        try:
            print(f"Trying {url} with container {c}")
            # use sync wrapper
            r = interact_detailed_sync(url, c, ELEMENT_SELECTORS, 'click', timeout, headless)
            # ensure r is a dict
            if not isinstance(r, dict):
                last_error = f'unexpected result type: {type(r)}'
                continue

            # if interact_detailed_sync returns a truthy dict, return it (even if ok:false)
            return r, c
        except Exception as e:
            last_error = str(e)
            continue
    # if all container candidates failed, try auto-discovery on the whole page
    print(f"Container candidates failed for {url}, trying auto-discovery")
    try:
        discovered = auto_discover_selectors(url, headless=headless, timeout=timeout)
        if discovered:
            print(f"Discovered selectors: {discovered}")
            r = interact_detailed_sync(url, 'body', discovered, 'click', timeout, headless)
            if isinstance(r, dict):
                return r, 'body(auto-discovery)'
            else:
                return { 'ok': False, 'error': 'auto-discovery returned non-dict' }, 'body(auto-discovery)'
    except Exception as e:
        last_error = str(e)

    return { 'ok': False, 'error': f'All containers failed: {last_error}' }, None


def auto_discover_selectors(url: str, headless: bool = True, timeout: int = 15000):
    """Open the page headfully (or headless) and scan for anchors/buttons with keyword hints.
    Returns a list of selectors to try (ordered by heuristic score) or None.
    """
    keywords = ['apply', 'availability', 'floorplan', 'tour', 'contact', 'schedule', 'rent', 'price', 'availability']
    # use the interactor to open the page and return candidate selectors via evaluate
    payload_selectors = [
        "Array.from(document.querySelectorAll('a,button')).map(el=>({text:el.innerText||el.textContent||'', cls:el.className||'', id:el.id||'', href:el.getAttribute('href')||''}))"
    ]
    # We'll do a lightweight Playwright session to collect candidates
    try:
        from playwright.async_api import async_playwright
    except Exception:
        return None

    import asyncio

    async def _collect():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=headless)
            context = await browser.new_context(viewport={'width':1366,'height':900})
            page = await context.new_page()
            try:
                await page.goto(url, wait_until='domcontentloaded', timeout=20000)
                # close common overlays
                try:
                    await page.evaluate("""
                        () => {
                            ['#acsBtn', '#acsClose', '.close.acs-Close', '#rl-email-container', '#rl-email'].forEach(s => {
                                const el = document.querySelector(s);
                                if (el && el.click) try { el.click(); } catch(e) {}
                                if (el && el.remove) try { el.remove(); } catch(e) {}
                            });
                        }
                    """)
                except Exception:
                    pass

                # collect anchors and buttons
                elems = await page.evaluate("Array.from(document.querySelectorAll('a,button')).map(el=>({text:el.innerText||el.textContent||'', cls:el.className||'', id:el.id||'', href:el.getAttribute('href')||''}))")

                candidates = []
                for e in elems:
                    txt = (e.get('text') or '').strip().lower()
                    cls = (e.get('cls') or '').lower()
                    href = (e.get('href') or '')
                    idv = (e.get('id') or '')
                    score = 0
                    for k in keywords:
                        if k in txt:
                            score += 3
                        if k in cls:
                            score += 2
                        if k in idv:
                            score += 2
                        if k in href:
                            score += 1
                    if score > 0:
                        # prefer anchors with hrefs
                        selector = None
                        if idv:
                            selector = f"#{idv}"
                        elif cls:
                            # use first token of class
                            first = cls.split()[0]
                            selector = f".{first}"
                        else:
                            selector = f"a[href='{href}']" if href else 'a'
                        candidates.append((score, selector))

                # rank and dedupe selectors
                candidates.sort(key=lambda x: x[0], reverse=True)
                selectors = []
                seen = set()
                for s in candidates:
                    if s[1] not in seen:
                        selectors.append(s[1])
                        seen.add(s[1])
                return selectors[:10]
            finally:
                await context.close()
                await browser.close()

    try:
        return asyncio.get_event_loop().run_until_complete(_collect())
    except Exception:
        # fallback: return None
        return None


def save_result(url: str, result: dict, used_container: str | None):
    ts = int(time.time())
    slug = slug_for_url(url)
    filename = OUT_DIR / f"{slug}_{ts}.json"
    out = {
        'url': url,
        'used_container': used_container,
        'result': result,
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    return filename


def prepare_supabase_push_code():
    # returns a snippet the user can run with environment variables SUPABASE_URL and SUPABASE_KEY
    snippet = '''
import os
from supabase import create_client
import json

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception('Set SUPABASE_URL and SUPABASE_KEY in environment')

client = create_client(SUPABASE_URL, SUPABASE_KEY)

def push_json(table_name, payload):
    return client.table(table_name).insert(payload).execute()

'''
    return snippet


def main():
    headless = False
    # Run sites; change slice to run fewer for quicker demos
    sites_to_run = SITES[:3]  # update to SITES to run all
    report = []
    for s in sites_to_run:
        try:
            res, used = run_site(s, headless=headless)
            # determine if result is actionable
            success = False
            # common positive signals
            if isinstance(res, dict):
                if res.get('ok') is True:
                    success = True
                if res.get('modalHtml'):
                    success = True
                if res.get('matchedSelector'):
                    success = True
                if res.get('href') and (not str(res.get('href')).lower().startswith('javascript')):
                    success = True

            skip_note = None
            if not success:
                skip_note = res.get('error') or 'no actionable elements found'
                # annotate the result before saving
                if isinstance(res, dict):
                    res['skipped'] = True
                    res['skip_reason'] = skip_note

            fname = save_result(s, res, used)
            print('Saved', fname)
            report.append((s, success, str(fname), res.get('ok', False), res.get('error') or skip_note))
        except Exception as e:
            report.append((s, False, None, False, str(e)))

    print('\nBatch run summary:')
    for r in report:
        print(r)

    # output Supabase helper snippet (not executed)
    print('\nSupabase push snippet:\n')
    print(prepare_supabase_push_code())


if __name__ == '__main__':
    main()
