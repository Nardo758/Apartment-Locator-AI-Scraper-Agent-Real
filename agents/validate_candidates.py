import json
import time
import random
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
CANDIDATES_DIR = ROOT / 'candidates'
VALIDATED_DIR = ROOT / 'candidates_validated'
INTERACTOR_PATH = ROOT / 'element_interaction.js'
STEALTH_PATH = ROOT / 'stealth.js'

VALIDATED_DIR.mkdir(exist_ok=True)
# Multiply human-like delays by this factor; set to 1.5 to be 50% slower than before.
# Increase this to slow all waits/clicks/navigation. Set to 3.0 for much slower, more human-like pacing.
HUMAN_SPEED_FACTOR = 3.0
IMPORTANT_KEYWORDS = ['floor', 'floorplan', 'floor plan', 'amenit', 'amenities', 'pricing', 'price', 'fees', 'concession', 'concessions', 'rent']

# Mapping from candidate file stem to site URL (provided by user)
VIDEO_TO_URL = {
    'Amli Arts Center ': 'https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center',
    'Amli Atlantic Station': 'https://www.amli.com/apartments/atlanta/midtown-apartments',
    'Atlantic House Midtown': 'https://atlantichousemidtown.com',
    'Novel Midtown Atlanta': 'https://novelmidtownatl.com',
    'Sentral.com': 'https://sentral.com/atlanta/west-midtown',
    'Windsorcommunites': 'https://www.windsoratmidtown.com',
    'Broadstone2thirty': 'https://www.broadstone2thirty.com',
    'Centennialplaceapts': 'https://www.centennialplaceapts.com',
    'Cortland Peachtree Corners': 'https://cortland.com/apartments/atlanta-metro/cortland-brookhaven',
    'Maa-Brookhaven': 'https://www.maac.com/georgia/atlanta/maa-brookhaven',
    # Add others as needed
}


def load_interactor_source():
    try:
        return INTERACTOR_PATH.read_text(encoding='utf-8')
    except Exception:
        return None


def load_stealth_source():
    try:
        return STEALTH_PATH.read_text(encoding='utf-8')
    except Exception:
        return None


def human_read_time():
    # time spent reading/scanning a page before interacting (seconds)
    # user requested a 15s read time
    return 15.0


def human_page_transition_delay():
    # realistic delay between page navigations (2-30s)
    return random.uniform(2.0, 30.0)


def human_scroll_to_element(page, locator):
    """Scroll toward the element in small, human-like steps rather than sweeping the whole page.
    This targets the element's bounding box center and performs a few incremental scrolls.
    """
    try:
        # ensure the locator has a bounding box
        bb = locator.bounding_box()
        if not bb:
            # fallback: a short gentle scroll
            try:
                page.evaluate('window.scrollBy(0, 200)')
            except Exception:
                pass
            time.sleep(random.uniform(0.5, 1.2))
            return

        # get current scrollY and viewport height
        try:
            cur = page.evaluate('() => window.scrollY')
            vp = page.evaluate('() => ({h: window.innerHeight})')
            cur_y = float(cur or 0)
            vp_h = int(vp.get('h', 800))
        except Exception:
            cur_y = 0.0
            vp_h = 800

        target_y = max(0, bb['y'] - vp_h * 0.33)
        distance = target_y - cur_y
        # perform a few steps proportional to distance
        steps = max(1, min(6, int(abs(distance) / (vp_h * 0.2))))
        for i in range(steps):
            step = cur_y + (distance * (i + 1) / steps)
            try:
                page.evaluate(f'window.scrollTo(0, {int(step)})')
            except Exception:
                try:
                    page.evaluate('window.scrollBy(0, 150)')
                except Exception:
                    pass
            time.sleep(random.uniform(0.4, 1.0))
    except Exception:
        # best-effort only
        pass


def safe_click(locator, page):
    try:
        locator.scroll_into_view_if_needed()
        # small randomized delay to mimic human interaction
        base_delay = 0.5 + random.random() * 1.0
        time.sleep(base_delay)

        # attempt to move mouse to element center with small jittered steps
        try:
            bb = locator.bounding_box()
            if bb:
                cx = bb['x'] + bb['width'] / 2
                cy = bb['y'] + bb['height'] / 2
                steps = random.randint(3, 7)
                for _ in range(steps):
                    tx = cx + random.uniform(-12, 12)
                    ty = cy + random.uniform(-12, 12)
                    try:
                        page.mouse.move(tx, ty)
                    except Exception:
                        pass
                    time.sleep(random.uniform(0.04, 0.12))
                try:
                    page.mouse.move(cx, cy)
                except Exception:
                    pass
                time.sleep(random.uniform(0.15, 0.45))
                try:
                    locator.hover()
                except Exception:
                    pass
        except Exception:
            # ignore bounding box issues
            pass

        # final small think before click
        time.sleep(random.uniform(0.1, 0.5))
        # click via Playwright locator (with generous timeout)
        locator.click(timeout=int(10000))
        return True, None
    except Exception as e:
        return False, str(e)


def validate_site(playwright, url, candidates_file, headful=False):
    browser = playwright.chromium.launch(headless=not headful)
    context = browser.new_context()
    page = context.new_page()
    report = {'url': url, 'candidates_file': str(candidates_file.name), 'results': []}

    # inject stealth script first (best-effort to avoid simple bot checks)
    stealth_src = load_stealth_source()
    if stealth_src:
        try:
            page.add_init_script(stealth_src)
            # also inject as script tag in case init didn't apply
            page.add_script_tag(content=stealth_src)
        except Exception:
            pass

    inter_src = load_interactor_source()
    if inter_src:
        try:
            page.add_init_script(inter_src)
            page.add_script_tag(content=inter_src)
        except Exception:
            pass

    try:
        page.goto(url, timeout=int(30000 * HUMAN_SPEED_FACTOR))
    except Exception as e:
        report['error'] = f'goto-failed: {e}'
        browser.close()
        return report

    # small wait for dynamic content (slowed by HUMAN_SPEED_FACTOR)
    # make this longer to ensure dynamic content has time to render
    time.sleep(3 * HUMAN_SPEED_FACTOR)

    data = json.loads(candidates_file.read_text(encoding='utf-8'))
    candidates = data.get('candidates', [])

    out_dir = VALIDATED_DIR / (candidates_file.stem)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Quick pass: look for anchor links (<a>) with important keywords and try them first
    try:
        for kw in IMPORTANT_KEYWORDS:
            # find anchors with visible text containing the keyword
            try:
                a_locator = page.locator("xpath=//a[contains(translate(normalize-space(string(.)), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '%s')]")
                # format string safely
                a_locator = page.locator(f"xpath=//a[contains(translate(normalize-space(string(.)), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{kw}')]")
            except Exception:
                continue
            try:
                a_count = a_locator.count()
            except Exception:
                a_count = 0
            for ai in range(min(a_count, 3)):
                loc = a_locator.nth(ai)
                try:
                    if not loc.is_visible():
                        continue
                except Exception:
                    continue
                item = {'expr': f'a[text contains {kw}]', 'type': 'anchor_keyword', 'matches': []}
                before = page.url
                # targeted scroll and read before clicking
                human_scroll_to_element(page, loc)
                time.sleep(human_read_time())
                ok, err = safe_click(loc, page)
                time.sleep(human_page_transition_delay() * 0.2)
                after = page.url
                match = {'index': ai, 'visible': True, 'clicked': ok, 'click_error': err, 'before_url': before, 'after_url': after}
                # screenshot
                try:
                    shot = out_dir / f"anchor_shot_{int(time.time()*1000)}_{kw}_{ai}.png"
                    page.screenshot(path=str(shot), full_page=True)
                    match['screenshot'] = str(shot.name)
                except Exception:
                    match['screenshot'] = None
                item['matches'].append(match)
                # record this anchor test so we know what happened
                # don't revert navigation; continue on the new page if navigation occurred
                frame_info = {'time': None, 'motion': None, 'ocr': None, 'image': None, 'tested': [item]}
                # save immediately
                try:
                    anchor_out = out_dir / f'anchor_validation_{kw}.json'
                    anchor_out.write_text(__import__('json').dumps(frame_info, indent=2), encoding='utf-8')
                except Exception:
                    pass
    except Exception:
        # best-effort anchor probing; proceed to candidates
        pass

    # sort frame candidates so those containing important keywords are tested first
    for entry in candidates:
        entry_candidates = entry.get('candidates', [])
        try:
            entry['candidates'] = sorted(entry_candidates, key=lambda c: 0 if not any(k in (c.get('expr') or '').lower() for k in IMPORTANT_KEYWORDS) else -1)
        except Exception:
            entry['candidates'] = entry_candidates
    for entry in candidates:
        t = entry.get('time')
        frame_info = {'time': t, 'motion': entry.get('motion'), 'ocr': entry.get('ocr'), 'image': entry.get('image'), 'tested': []}
        for cand in entry.get('candidates', []):
            expr = cand.get('expr')
            typ = cand.get('type')
            item = {'expr': expr, 'type': typ, 'matches': []}
            try:
                locator = page.locator('xpath=' + expr)
                count = locator.count()
            except Exception as e:
                item['error'] = f'locator-error: {e}'
                frame_info['tested'].append(item)
                continue

            item['count'] = count
            for i in range(min(count, 3)):
                loc = locator.nth(i)
                try:
                    visible = loc.is_visible()
                except Exception:
                    visible = False
                match = {'index': i, 'visible': visible}
                if visible:
                    before = page.url
                    # perform targeted, human-like scroll toward the element and a longer read pause
                    human_scroll_to_element(page, loc)
                    time.sleep(human_read_time())

                    expr_l = (expr or '').lower()
                    should_click = any(k in expr_l for k in IMPORTANT_KEYWORDS)
                    # if candidate looks important, click and allow navigation; otherwise hover/screenshot only
                    if should_click:
                        ok, err = safe_click(loc, page)
                        # allow extra time for navigation/modal actions (and a transition delay)
                        time.sleep(human_page_transition_delay() * 0.2)
                    else:
                        # minimal interaction: hover and short pause
                        try:
                            loc.scroll_into_view_if_needed()
                        except Exception:
                            pass
                        try:
                            loc.hover()
                        except Exception:
                            pass
                        time.sleep(random.uniform(0.5, 1.2))
                        ok, err = False, None
                    after = page.url
                    match['clicked'] = ok
                    match['click_error'] = err
                    match['before_url'] = before
                    match['after_url'] = after
                    # detect simple modal
                    try:
                        modal = page.query_selector('.modal.show, [role="dialog"]')
                        match['modal_html'] = modal.inner_html() if modal else None
                    except Exception:
                        match['modal_html'] = None
                    # screenshot
                    shot = out_dir / f"shot_{int(time.time()*1000)}_{i}.png"
                    try:
                        page.screenshot(path=str(shot), full_page=True)
                        match['screenshot'] = str(shot.name)
                    except Exception:
                        match['screenshot'] = None
                    # if navigation occurred, stay on the new page and re-inject our scripts so further tests continue
                    if before != after:
                        try:
                            # re-inject stealth and interactor on the new page instance
                            if stealth_src:
                                try:
                                    page.add_script_tag(content=stealth_src)
                                except Exception:
                                    pass
                            if inter_src:
                                try:
                                    page.add_script_tag(content=inter_src)
                                except Exception:
                                    pass
                            # small pause to allow dynamic content to appear
                            time.sleep(1.0 * HUMAN_SPEED_FACTOR)
                        except Exception:
                            pass
                item['matches'].append(match)

            frame_info['tested'].append(item)

        report['results'].append(frame_info)

    browser.close()
    out_path = out_dir / 'validation.json'
    out_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    return report


def main(headful=False):
    with sync_playwright() as p:
        reports = []
        for cf in sorted(CANDIDATES_DIR.glob('*.candidates.json')):
            stem = cf.stem
            # try exact mapping, else try stem startswith
            url = VIDEO_TO_URL.get(stem)
            if not url:
                for k, v in VIDEO_TO_URL.items():
                    if stem.startswith(k):
                        url = v
                        break
            if not url:
                print('No mapping for', stem, '- skipping')
                continue
            print('Validating', stem, '->', url)
            r = validate_site(p, url, cf, headful=headful)
            reports.append(r)
            print('Wrote report for', stem)

    # write combined report
    combined = VALIDATED_DIR / 'combined_validation.json'
    combined.write_text(json.dumps(reports, indent=2), encoding='utf-8')
    print('Done. Combined report at', combined)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--headful', action='store_true', help='Run browser headful so you can watch')
    args = parser.parse_args()
    main(headful=args.headful)
