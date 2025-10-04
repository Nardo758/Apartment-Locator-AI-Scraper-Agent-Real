#!/usr/bin/env python3
from push_scrape_to_supabase import validate_and_coerce


def test_basic_validation():
    items = [
        {'property_id': 'p', 'unit_number': 'A1', 'current_price': '$1,234.50', 'bedrooms': '1', 'bathrooms': '1', 'square_feet': '700'},
        {'property_id': None, 'unit_number': None, 'current_price': None}
    ]
    cleaned, issues = validate_and_coerce(items)
    assert isinstance(cleaned, list)
    assert len(cleaned) == 2
    assert 'current_price' in cleaned[0]
    assert cleaned[0]['current_price'] == '1234.50'
    assert cleaned[1]['bedrooms'] == 0
    print('test_push_validation passed')


if __name__ == '__main__':
    test_basic_validation()
