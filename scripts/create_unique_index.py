import psycopg2, os, sys
uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not uri:
    print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to run create_unique_index.py')
    sys.exit(1)
conn = psycopg2.connect(uri); conn.autocommit = True; cur = conn.cursor()
try:
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_properties_prop_unit_unique ON public.scraped_properties (property_id, unit_number);")
    print('unique index created')
except Exception as e:
    print('index creation failed:', e)
cur.close(); conn.close()
