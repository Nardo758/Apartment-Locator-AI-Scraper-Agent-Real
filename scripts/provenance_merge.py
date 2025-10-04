"""
provenance_merge.py

Utility to deterministically merge an `apartments` record (AI-enriched) into a
canonical `scraped_properties` record and emit per-field provenance metadata.

Contract:
- Inputs: apartment (dict), scraped (dict)
- Output: (merged: dict, provenance: dict)
- Error modes: missing/None inputs -> treated as empty

Merge rules (simple, deterministic):
- Scalars (ai_price, effective_price): prefer apartment value if present; else keep scraped.
- Amenities: if both present and are lists/arrays, return union (preserving order not guaranteed);
  provenance notes both sources. If only one present, take it.
- For other display fields (name, address): keep scraped unless it's missing/blank, then take apartment.
- Always record provenance per-field with keys: source, source_value, chosen_value.

This module is intentionally DB-free for unit testing.
"""

from typing import Any, Dict, Tuple, List


def _normalize_amenities(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val]
    if isinstance(val, str):
        # Try to split comma-separated strings
        parts = [p.strip() for p in val.split(',') if p.strip()]
        return parts
    # If it's JSON-like (e.g., dict), try to extract values
    try:
        return [str(x) for x in list(val)]
    except Exception:
        return [str(val)]


def merge_apartment_into_scraped(apartment: Dict[str, Any], scraped: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Merge apartment -> scraped deterministically and return provenance metadata.

    Returns (merged, provenance) where provenance is a dict mapping field -> metadata.
    """
    if apartment is None:
        apartment = {}
    if scraped is None:
        scraped = {}

    merged = scraped.copy()  # start from canonical scraped
    prov: Dict[str, Dict[str, Any]] = {}

    # Helper to record provenance
    def record(field: str, source: str, source_value: Any, chosen: Any):
        prov[field] = {
            'source': source,
            'source_value': source_value,
            'chosen_value': chosen
        }

    # Fields where apartment is authoritative when present
    authoritative_from_apartment = ['ai_price', 'effective_price']

    for field in authoritative_from_apartment:
        a_val = apartment.get(field)
        s_val = scraped.get(field)
        if a_val is not None and a_val != "":
            merged[field] = a_val
            record(field, 'apartments', a_val, a_val)
        else:
            merged[field] = s_val
            record(field, 'scraped_properties', s_val, s_val)

    # Amenities: merge as union
    a_amen = _normalize_amenities(apartment.get('amenities'))
    s_amen = _normalize_amenities(scraped.get('amenities'))
    if a_amen and s_amen:
        # union while preserving order: start with scraped then append new ones from apartment
        seen = set()
        union_list = []
        for item in s_amen + a_amen:
            if item not in seen:
                seen.add(item)
                union_list.append(item)
        merged['amenities'] = union_list
        record('amenities', 'both', {'apartments': a_amen, 'scraped_properties': s_amen}, union_list)
    elif a_amen:
        merged['amenities'] = a_amen
        record('amenities', 'apartments', a_amen, a_amen)
    else:
        merged['amenities'] = s_amen or None
        record('amenities', 'scraped_properties', s_amen or None, s_amen or None)

    # Display fields: name, address - prefer scraped unless missing
    for field in ['name', 'address']:
        s_val = scraped.get(field)
        a_val = apartment.get(field)
        if s_val is None or (isinstance(s_val, str) and s_val.strip() == ""):
            merged[field] = a_val
            record(field, 'apartments' if a_val is not None else 'none', a_val, a_val)
        else:
            merged[field] = s_val
            record(field, 'scraped_properties', s_val, s_val)

    # Generic fallback: merge other keys from apartment if scraped missing
    for key, a_val in apartment.items():
        if key in merged:
            continue
        if a_val is not None:
            merged[key] = a_val
            record(key, 'apartments', a_val, a_val)

    return merged, prov


if __name__ == '__main__':
    # Quick manual smoke when executed directly
    sample_apartment = {
        'ai_price': 1500,
        'effective_price': 1450,
        'amenities': ['gym', 'pool'],
        'name': 'AI Name'
    }
    sample_scraped = {
        'current_price': 1600,
        'amenities': ['pool', 'parking'],
        'name': 'Scraped Name',
        'address': '123 Main St'
    }
    merged, prov = merge_apartment_into_scraped(sample_apartment, sample_scraped)
    print('MERGED:', merged)
    print('PROVENANCE:', prov)
