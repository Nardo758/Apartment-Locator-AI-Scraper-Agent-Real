import json
import time
import os
from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
VALIDATED_DIR = ROOT / 'candidates_validated'
EXTRACTIONS_DIR = ROOT / 'extraction_results'
INTERACTOR_PATH = ROOT / 'element_interaction.js'

EXTRACTIONS_DIR.mkdir(exist_ok=True)

# Mapping used previously
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
}


def load_interactor():
    try:
        return INTERACTOR_PATH.read_text(encoding='utf-8')
    except Exception:
        return None


def pick_best_candidate(validation):
    # validation is dict loaded from validation.json
    # iterate results (frames) and their tested candidates
    for frame in validation.get('results', []):
        for tested in frame.get('tested', []):
            # each tested item has 'matches'
            for m in tested.get('matches', []):
                if m.get('clicked'):
                    # prefer ones that opened modal or navigated
                    if m.get('modal_html') or (m.get('before_url') and m.get('after_url') and m.get('before_url') != m.get('after_url')):
                        return tested.get('expr') if tested.get('expr') else tested.get('expr')

    # fallback: pick the first candidate with count>0
    for frame in validation.get('results', []):
        for tested in frame.get('tested', []):
            if tested.get('count', 0) > 0:
                return tested.get('expr')

    return None


def extract_for_site(playwright, site_key, url, validated_dir, headful=False):
    browser = playwright.chromium.launch(headless=not headful)
    context = browser.new_context()
    page = context.new_page()

    inter_src = load_interactor()
    if inter_src:
        try:
            page.add_init_script(inter_src)
            page.add_script_tag(content=inter_src)
        except Exception:
            pass

    result = {'site_key': site_key, 'url': url, 'timestamp': datetime.utcnow().isoformat()}

    try:
        page.goto(url, timeout=30000)
    except Exception as e:
        result['error'] = f'goto-failed: {e}'
        browser.close()
        return result

    time.sleep(2)

    validation_path = validated_dir / 'validation.json'
    if not validation_path.exists():
        result['error'] = 'no-validation-file'
        browser.close()
        return result

    validation = json.loads(validation_path.read_text(encoding='utf-8'))

    # choose best candidate: look for matches with clicked true and modal or navigation
    best_expr = None
    # traversal: validation['results'] structure matches earlier output
    for frame in validation.get('results', []):
        for tested in frame.get('tested', []):
            expr = tested.get('expr')
            for m in tested.get('matches', []):
                if m.get('clicked') and (m.get('modal_html') or (m.get('before_url') and m.get('after_url') and m.get('before_url') != m.get('after_url'))):
                    best_expr = expr
                    break
            if best_expr:
                break
        if best_expr:
            break

    if not best_expr:
        # fallback: first tested with count>0
        for frame in validation.get('results', []):
            for tested in frame.get('tested', []):
                if tested.get('count', 0) > 0:
                    best_expr = tested.get('expr')
                    break
            if best_expr:
                break

    result['chosen_expr'] = best_expr
    if not best_expr:
        result['error'] = 'no-candidate'
        browser.close()
        return result

    # attempt to find and click
    try:
        locator = page.locator('xpath=' + best_expr)
        cnt = locator.count()
    except Exception as e:
        result['error'] = f'locator-error: {e}'
        browser.close()
        return result

    result['match_count'] = cnt
    clicked = False
    modal_html = None
    before_url = page.url
    for i in range(min(cnt, 3)):
        loc = locator.nth(i)
        try:
            if loc.is_visible():
                loc.scroll_into_view_if_needed()
                loc.click(timeout=5000)
                clicked = True
                time.sleep(1.0)
                # capture modal
                try:
                    modal = page.query_selector('.modal.show, [role="dialog"]')
                    modal_html = modal.inner_html() if modal else None
                except Exception:
                    modal_html = None
                break
        except Exception:
            continue

    result['clicked'] = clicked
    result['modal_html'] = modal_html
    result['final_url'] = page.url

    # screenshot final
    out_dir = EXTRACTIONS_DIR / site_key.replace(' ', '_')
    out_dir.mkdir(parents=True, exist_ok=True)
    shot = out_dir / f"extraction_{int(time.time()*1000)}.png"
    try:
        page.screenshot(path=str(shot), full_page=True)
        result['screenshot'] = str(shot.relative_to(ROOT))
    except Exception:
        result['screenshot'] = None

    # save page html
    try:
        html = page.content()
        (out_dir / 'page.html').write_text(html, encoding='utf-8')
        result['page_html_saved'] = True
    except Exception:
        result['page_html_saved'] = False

    browser.close()
    # write result
    out_file = EXTRACTIONS_DIR / f"{site_key.replace(' ', '_')}.json"
    out_file.write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


def push_to_supabase(records):
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    SUPABASE_TABLE = os.getenv('SUPABASE_TABLE')
    if not SUPABASE_URL or not SUPABASE_KEY or not SUPABASE_TABLE:
        return {'pushed': False, 'reason': 'missing-env'}
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{SUPABASE_TABLE}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    body = json.dumps(records).encode('utf-8')

    try:
        import requests
        r = requests.post(url, headers=headers, json=records, timeout=30)
        return {'pushed': True, 'status_code': r.status_code, 'response_text': r.text}
    except Exception:
        # fallback to urllib
        try:
            from urllib import request as _request
            req = _request.Request(url, data=body, method='POST')
            for k, v in headers.items():
                req.add_header(k, v)
            with _request.urlopen(req, timeout=30) as resp:
                resp_text = resp.read().decode('utf-8', errors='replace')
                return {'pushed': True, 'status_code': resp.getcode(), 'response_text': resp_text}
        except Exception as e:
            return {'pushed': False, 'reason': str(e)}


def main():
    with sync_playwright() as p:
        reports = []
        for vd in sorted(VALIDATED_DIR.iterdir()):
            if not vd.is_dir():
                continue
            stem = vd.name
            url = VIDEO_TO_URL.get(stem)
            if not url:
                # try startswith match
                for k, v in VIDEO_TO_URL.items():
                    if stem.startswith(k):
                        url = v
                        break
            if not url:
                print('No URL mapping for', stem, '- skipping')
                continue
            print('Extracting', stem, '->', url)
            r = extract_for_site(p, stem, url, vd, headful=False)
            reports.append(r)

    # attempt supabase push
    push_records = []
    for r in reports:
        rec = {
            'site_key': r.get('site_key'),
            'url': r.get('url'),
            'timestamp': r.get('timestamp'),
            'extraction': r,
        }
        push_records.append(rec)

    push_result = push_to_supabase(push_records)
    # save combined report
    combined = EXTRACTIONS_DIR / 'combined_extractions.json'
    combined.write_text(json.dumps({'reports': reports, 'supabase': push_result}, indent=2), encoding='utf-8')
    print('Done. Combined report at', combined)

    if not push_result.get('pushed'):
        instr = ROOT / 'SUPABASE_PUSH_INSTRUCTIONS.txt'
        instr.write_text('Set SUPABASE_URL, SUPABASE_KEY and SUPABASE_TABLE environment variables and re-run this script to push results.\nExample:\n$env:SUPABASE_URL="https://xyz.supabase.co"; $env:SUPABASE_KEY="<key>"; $env:SUPABASE_TABLE="training_results"; python run_extraction_and_push.py\n', encoding='utf-8')
        print('Supabase not configured; wrote instructions to', instr)


if __name__ == '__main__':
    main()
