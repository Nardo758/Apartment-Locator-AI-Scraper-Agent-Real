import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
CANDIDATES_DIR = ROOT / 'candidates'
VALIDATED_DIR = ROOT / 'candidates_validated'
INTERACTOR_PATH = ROOT / 'element_interaction.js'

VALIDATED_DIR.mkdir(exist_ok=True)

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


def safe_click(locator):
    try:
        locator.scroll_into_view_if_needed()
        locator.click(timeout=5000)
        return True, None
    except Exception as e:
        return False, str(e)


def validate_site(playwright, url, candidates_file, headful=False):
    browser = playwright.chromium.launch(headless=not headful)
    context = browser.new_context()
    page = context.new_page()
    report = {'url': url, 'candidates_file': str(candidates_file.name), 'results': []}

    inter_src = load_interactor_source()
    if inter_src:
        try:
            page.add_init_script(inter_src)
            page.add_script_tag(content=inter_src)
        except Exception:
            pass

    try:
        page.goto(url, timeout=30000)
    except Exception as e:
        report['error'] = f'goto-failed: {e}'
        browser.close()
        return report

    # small wait for dynamic content
    time.sleep(2)

    data = json.loads(candidates_file.read_text(encoding='utf-8'))
    candidates = data.get('candidates', [])

    out_dir = VALIDATED_DIR / (candidates_file.stem)
    out_dir.mkdir(parents=True, exist_ok=True)

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
                    ok, err = safe_click(loc)
                    time.sleep(1.0)
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
                    # if navigation occurred, navigate back
                    if before != after:
                        try:
                            page.goto(before, timeout=15000)
                            time.sleep(0.5)
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
