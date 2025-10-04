import json
from provenance_merge import merge_apartment_into_scraped


def test_merge_basic():
    apartment = {
        'ai_price': 1500,
        'effective_price': 1450,
        'amenities': ['gym', 'pool'],
        'name': 'AI Name'
    }
    scraped = {
        'current_price': 1600,
        'amenities': ['pool', 'parking'],
        'name': 'Scraped Name',
        'address': '123 Main St'
    }

    merged, prov = merge_apartment_into_scraped(apartment, scraped)

    assert merged['ai_price'] == 1500
    assert merged['effective_price'] == 1450
    # amenities union includes pool, parking, gym (preserve scraped order first)
    assert 'parking' in merged['amenities'] and 'gym' in merged['amenities']
    # name should remain scraped
    assert merged['name'] == 'Scraped Name'
    # provenance fields
    assert prov['ai_price']['source'] == 'apartments'
    assert prov['name']['source'] == 'scraped_properties'


if __name__ == '__main__':
    test_merge_basic()
    print('test passed')
