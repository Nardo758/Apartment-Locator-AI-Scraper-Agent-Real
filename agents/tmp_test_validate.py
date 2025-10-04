import json
from agents.push_scrape_to_supabase import validate_and_coerce

items = [
  {'property_id':'p','unit_number':'1','current_price':'$1,234.56','bedrooms':'2','bathrooms':'1.75','square_feet':'900'},
  {'property_id':'p','unit_number':'2','current_price':1234.4,'bedrooms':1.0,'bathrooms':'2','square_feet':None},
  {'property_id':'p','unit_number':'3','current_price':None,'bedrooms':None,'bathrooms':None,'square_feet':'abc'}
]

print('INPUT:')
print(json.dumps(items, indent=2))
cleaned, issues = validate_and_coerce(items)
print('\nCLEANED:')
print(json.dumps(cleaned, indent=2))
print('\nISSUES:')
print(issues)
