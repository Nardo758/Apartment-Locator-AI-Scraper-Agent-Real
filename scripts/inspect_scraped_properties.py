import psycopg2, json, os, sys
uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not uri:
	print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to run this script.')
	sys.exit(1)
conn = psycopg2.connect(uri)
conn.autocommit=True
cur=conn.cursor()
cur.execute("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='scraped_properties' ORDER BY ordinal_position;")
rows=cur.fetchall()
print(json.dumps(rows, indent=2))
cur.close()
conn.close()
