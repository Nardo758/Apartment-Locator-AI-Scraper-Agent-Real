#!/usr/bin/env python3
"""Simple live scraper for one URL: saves screenshot, page HTML, and extracts price/unit candidates."""
import sys
import re
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright


def sanitize_name(url):
    return re.sub(r'[^A-Za-z0-9_-]+', '_', url)


def extract_prices(text):
    # simple $1,234 patterns
    prices = re.findall(r"\$\s?\d{1,3}(?:,\d{3})+", text)
    # also catch $1000 (no comma)
    prices += re.findall(r"\$\s?\d{3,4}\b", text)
    # dedupe and normalize
    out = []
    for p in prices:
        p2 = p.replace(' ', '')
        if p2 not in out:
            out.append(p2)
    return out


def extract_units(text):
    patterns = [r"\d+\s*bed(?:room)?s?", r"\d+\s*br\b", r"\d+\s*bath(?:room)?s?", r"1\s*bed", r"2\s*bed", r"3\s*bed", r"\bone\s*bedroom\b", r"two\s*bedroom\b"]
    out = []
    for pat in patterns:
        found = re.findall(pat, text, flags=re.I)
        for f in found:
            if f.lower() not in [o.lower() for o in out]:
                out.append(f.strip())
    return out


def main():
    if len(sys.argv) < 2:
        print('Usage: python live_scrape_one.py <url> [output_dir]')
        sys.exit(1)

    url = sys.argv[1]
    out_root = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent / 'live_results'
    out_root.mkdir(parents=True, exist_ok=True)

    name = sanitize_name(url)
    out_dir = out_root / name
    out_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            page.goto(url, timeout=45000)
        except Exception as e:
            result = {'url': url, 'error': f'goto_failed: {e}'}
            (out_dir / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
            print('Failed to open page:', e)
            browser.close()
            return

        time.sleep(2)
        # screenshot
        shot = out_dir / 'screenshot.png'
        try:
            page.screenshot(path=str(shot), full_page=True)
        except Exception:
            pass

        # save html
        html_path = out_dir / 'page.html'
        try:
            html = page.content()
            html_path.write_text(html, encoding='utf-8')
        except Exception:
            html = ''

        # visible text
        try:
            vtext = page.inner_text('body')
        except Exception:
            vtext = ''

        prices = extract_prices(html + '\n' + vtext)
        units = extract_units(html + '\n' + vtext)

        result = {
            'url': url,
            'timestamp': time.time(),
            'screenshot': str(shot.relative_to(out_dir)) if shot.exists() else None,
            'html_saved': html_path.exists(),
            'prices_found': prices,
            'units_found': units,
        }

        (out_dir / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
        print('Wrote result to', out_dir / 'result.json')
        browser.close()


if __name__ == '__main__':
    main()
