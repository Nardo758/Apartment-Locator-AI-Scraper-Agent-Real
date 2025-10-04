from agents.push_scrape_to_supabase import validate_and_coerce
items = [
    {'property_id':'p1','unit_number':'u1','current_price':'$1,234.56','bedrooms': '1','bathrooms':1.75,'square_feet':'750'},
    {'property_id':'p2','unit_number':'u2','current_price':None,'bedrooms':None,'bathrooms':None,'square_feet':None}
]
cleaned, issues = validate_and_coerce(items)
print('CLEANED:', cleaned)
print('ISSUES:', issues)
