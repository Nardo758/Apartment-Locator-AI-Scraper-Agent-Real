#!/usr/bin/env python3
from push_scrape_to_supabase import validate_and_coerce


def test_edge_cases():
    items = [
        {'property_id': 'p', 'unit_number': 'A1', 'current_price': '$1,234.5', 'bedrooms': '1.0', 'bathrooms': '1.5', 'square_feet': '700'},
        {'property_id': '', 'unit_number': 'B2', 'current_price': 'N/A', 'bedrooms': None, 'bathrooms': None, 'square_feet': 'n/a'},
        {'property_id': 'p2', 'unit_number': 'C3', 'current_price': 1568.5, 'bedrooms': 2.0, 'bathrooms': '2', 'square_feet': 900}
    ]
    cleaned, issues = validate_and_coerce(items)
    assert cleaned[0]['current_price'] == '1234.50'
    assert isinstance(cleaned[0]['bathrooms'], float)
    assert cleaned[1]['current_price'] is None or 'could not be parsed' in ' '.join(issues)
    assert cleaned[2]['current_price'] == '1568.50'
    print('test_push_validation_edges passed')


if __name__ == '__main__':
    test_edge_cases()
