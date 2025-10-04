#!/usr/bin/env python3
"""Parse a saved page.html and extract candidate prices and unit descriptors.

Usage: python parse_saved_page.py <saved_page_dir>
"""
import sys
import re
import json
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None


PRICE_PATTERNS = [
    r"\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?",  # $1,234.56
    r"\$\s?\d{3,4}\b",
    r"\d{1,3}(?:,\d{3})*\s*(?:per month|/month|monthly)"  # 1,234 per month
]

UNIT_PATTERNS = [
    r"\b\d+\s*(?:bed|beds|bedroom|bedrooms|br)\b",
    r"\b\d+\s*(?:bath|baths|bathroom|bathrooms|ba)\b",
    r"\bStudio\b",
    r"\bOne Bedroom\b",
    r"\bTwo Bedroom\b",
    r"\bThree Bedroom\b",
]

COMMON_PRICE_CLASSES = ['price', 'rent', 'rent-price', 'rent_price', 'monthly', 'monthly-rent', 'pricing', 'price-amount']


def find_with_bs4(html):
    soup = BeautifulSoup(html, 'html.parser')
    results = {'prices': [], 'units': [], 'detected_selectors': []}

    text = soup.get_text(separator=' ')

    # regex price matches across whole text
    pset = set()
    for pat in PRICE_PATTERNS:
        for m in re.findall(pat, text, flags=re.I):
            m2 = m.strip()
            if m2 not in pset:
                pset.add(m2)
                results['prices'].append({'text': m2, 'selector': None, 'method': 'global_regex'})

    # Find elements with common price class names
    for cls in COMMON_PRICE_CLASSES:
        # use attribute selector without an initial dot
        for el in soup.select(f"[class*='{cls}']"):
            t = el.get_text(separator=' ', strip=True)
            if not t:
                continue
            # extract price tokens inside
            for pat in PRICE_PATTERNS:
                for m in re.findall(pat, t, flags=re.I):
                    entry = {'text': m.strip(), 'selector': css_selector_for(el), 'method': f'class_probe:{cls}'}
                    if entry not in results['prices']:
                        results['prices'].append(entry)

    # For remaining price-like spans, search all tags
    for tag in soup.find_all(text=re.compile(r"\$\s?\d", flags=re.I)):
        el = tag.parent
        t = el.get_text(separator=' ', strip=True)
        for pat in PRICE_PATTERNS:
            for m in re.findall(pat, t, flags=re.I):
                entry = {'text': m.strip(), 'selector': css_selector_for(el), 'method': 'parent_text'}
                if entry not in results['prices']:
                    results['prices'].append(entry)

    # Units
    uset = set()
    for pat in UNIT_PATTERNS:
        for m in re.findall(pat, text, flags=re.I):
            m2 = m.strip()
            if m2.lower() not in (x.lower() for x in uset):
                uset.add(m2)
                results['units'].append({'text': m2, 'selector': None, 'method': 'global_regex'})

    # try to find unit labels near prices: look for parents of price elements
    for p in results['prices']:
        sel = p.get('selector')
        if sel:
            try:
                el = soup.select_one(sel)
                if el:
                    # look for sibling text
                    sib_texts = []
                    for sib in el.find_next_siblings(limit=6):
                        t = sib.get_text(separator=' ', strip=True)
                        if t:
                            sib_texts.append(t)
                    for pat in UNIT_PATTERNS:
                        for s in sib_texts:
                            for m in re.findall(pat, s, flags=re.I):
                                entry = {'text': m.strip(), 'selector': None, 'method': f'near_price:{sel}'}
                                if entry not in results['units']:
                                    results['units'].append(entry)
            except Exception:
                pass

    return results


def css_selector_for(el):
    # prefer id
    try:
        if el is None:
            return None
        if el.has_attr('id') and el['id'].strip():
            return f"#{el['id'].strip()}"
        classes = el.get('class', [])
        tag = el.name
        if classes:
            cls = '.'.join([c.replace(' ', '_') for c in classes if c])
            return f"{tag}.{cls}"
        return tag
    except Exception:
        return None


def fallback_text_scan(html):
    # fallback when bs4 not available: regex on raw HTML
    results = {'prices': [], 'units': []}
    text = re.sub(r'<[^>]+>', ' ', html)
    pset = set()
    for pat in PRICE_PATTERNS:
        for m in re.findall(pat, text, flags=re.I):
            m2 = m.strip()
            if m2 not in pset:
                pset.add(m2)
                results['prices'].append({'text': m2, 'method': 'regex_raw'})
    uset = set()
    for pat in UNIT_PATTERNS:
        for m in re.findall(pat, text, flags=re.I):
            m2 = m.strip()
            if m2.lower() not in (x.lower() for x in uset):
                uset.add(m2)
                results['units'].append({'text': m2, 'method': 'regex_raw'})
    return results


def main():
    if len(sys.argv) < 2:
        print('Usage: python parse_saved_page.py <saved_page_dir>')
        sys.exit(1)

    saved_dir = Path(sys.argv[1])
    if not saved_dir.exists():
        print('Path not found:', saved_dir)
        sys.exit(1)

    html_path = saved_dir / 'page.html'
    if not html_path.exists():
        print('page.html not found in', saved_dir)
        sys.exit(1)

    html = html_path.read_text(encoding='utf-8')

    if BeautifulSoup:
        results = find_with_bs4(html)
    else:
        results = fallback_text_scan(html)

    out = saved_dir / 'parsed_candidates.json'
    out.write_text(json.dumps(results, indent=2), encoding='utf-8')
    print('Wrote', out)


if __name__ == '__main__':
    main()
