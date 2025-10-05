import psycopg2, os, sys
uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not uri:
	print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to run add_missing_columns.py')
	sys.exit(1)
conn = psycopg2.connect(uri)
conn.autocommit=True
cur=conn.cursor()
cur.execute("ALTER TABLE public.scraped_properties ADD COLUMN IF NOT EXISTS ai_provider text;")
cur.execute("ALTER TABLE public.scraped_properties ADD COLUMN IF NOT EXISTS ai_raw jsonb;")
print('columns added')
cur.close()
conn.close()
