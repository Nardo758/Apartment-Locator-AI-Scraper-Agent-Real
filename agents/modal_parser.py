from bs4 import BeautifulSoup
import re

def parse_floorplan_modal(html: str) -> dict:
    """Parse modal HTML (string) and return structured floorplan info.

    Fields returned (best-effort):
      - name
      - sqft
      - beds
      - baths
      - price_text
      - availability_text
      - availability_href (href inside modal that leads to /floorplans/... or external)
      - contact_href (contact link inside modal)
      - data_selenium_ids (list)
    """
    soup = BeautifulSoup(html, 'html.parser')
    out = {
        'name': None,
        'sqft': None,
        'beds': None,
        'baths': None,
        'price_text': None,
        'availability_text': None,
        'availability_href': None,
        'contact_href': None,
        'data_selenium_ids': [],
    }

    # name: h2 or h3 with modal title
    title = soup.select_one('h2.h3, h2, h3, .modal-header h2, .modal-header h3')
    if title and title.get_text(strip=True):
        out['name'] = title.get_text(strip=True)

    # find data-selenium-id attributes
    for el in soup.select('[data-selenium-id]'):
        out['data_selenium_ids'].append(el.get('data-selenium-id'))

    # find availability anchor (prefer /floorplans/ links or anchors with track-apply)
    avail = soup.select_one('a.track-apply[href]') or soup.select_one('a[href*="/floorplans/"]') or soup.select_one('a[data-selenium-id*="apply"][href]') or soup.select_one('a.btn-primary[href]')
    if avail:
        out['availability_href'] = avail.get('href')
        out['availability_text'] = avail.get_text(strip=True)

    # contact href
    contact = soup.select_one('a[href*="contact"], a[data-modal-url], a.track-dialog, a[data-selenium-id*="contact"]')
    if contact:
        out['contact_href'] = contact.get('href')

    # price and sqft/beds/baths: try common patterns
    # price: look for $ or 'Call for details'
    price_el = soup.select_one('.fp-details .text-dark, .fp-details .text-2x, .fp-details .price, .fp-details')
    if price_el:
        txt = price_el.get_text(' ', strip=True)
        out['price_text'] = txt
        m = re.search(r'\$[\d,]+(?:\s*-\s*\$[\d,]+)?', txt)
        if m:
            out['price_text'] = m.group(0)

    # beds/baths/sqft: look for list items or inline text in modal
    list_items = soup.select('.fp-details ul.list-unstyled li')
    if list_items:
        for li in list_items:
            t = li.get_text(strip=True)
            if 'Bed' in t or 'Bed' in t.title() or re.search(r'\d+\s*Bed', t, re.I):
                out['beds'] = t
            if 'Bath' in t or re.search(r'\d+\s*Bath', t, re.I):
                out['baths'] = t
            if 'Sq' in t or 'Sq.' in t or 'Sq ' in t or re.search(r'\d+\s*Sq', t, re.I):
                out['sqft'] = t

    # fallback: look for patterns anywhere
    body_txt = soup.get_text(' ', strip=True)
    if not out['sqft']:
        m = re.search(r'(\d{2,4})\s*(?:Sq\.?\s*Ft\.?|Sq\.?\s*Ft|Sq\b|sqft)', body_txt, re.I)
        if m:
            out['sqft'] = m.group(0)
    if not out['beds']:
        m = re.search(r'(\d)\s*(?:Bed|Bedroom|Beds)\b', body_txt, re.I)
        if m:
            out['beds'] = m.group(0)
    if not out['baths']:
        m = re.search(r'(\d)\s*(?:Bath|Bathroom|Baths)\b', body_txt, re.I)
        if m:
            out['baths'] = m.group(0)

    # availability text
    if not out['availability_text']:
        m = re.search(r'(Available\s*(?:Now|\d{4}-\d{2}-\d{2}|\w+))', body_txt, re.I)
        if m:
            out['availability_text'] = m.group(0)

    return out
