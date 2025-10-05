import psycopg2, json, os, sys
uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not uri:
	print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to run show_recent_scraped.py')
	sys.exit(1)
conn = psycopg2.connect(uri); cur = conn.cursor();
cur.execute("SELECT external_id, property_id, unit_number, current_price, created_at, updated_at FROM public.scraped_properties ORDER BY updated_at DESC LIMIT 5;")
print(json.dumps(cur.fetchall(), default=str, indent=2))
cur.close(); conn.close()
