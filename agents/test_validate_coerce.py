import json
from agents.push_scrape_to_supabase import validate_and_coerce


def test_price_and_bathrooms():
    items = [
        {'property_id':'p','unit_number':'1','current_price':'$1,234.56','bedrooms':'2','bathrooms':'1.75','square_feet':'900'},
        {'property_id':'p','unit_number':'2','current_price':1234.4,'bedrooms':1.0,'bathrooms':'2','square_feet':None}
    ]
    cleaned, issues = validate_and_coerce(items)
    assert cleaned[0]['current_price'] == 1235
    assert abs(cleaned[0]['bathrooms'] - 1.8) < 1e-6
    assert cleaned[1]['current_price'] == 1234
    assert cleaned[1]['bathrooms'] == 2.0


if __name__ == '__main__':
    test_price_and_bathrooms()
    print('ok')
