import psycopg2, os, sys
uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not uri:
	print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to run verify_function.py')
	sys.exit(1)
conn = psycopg2.connect(uri)
conn.autocommit=True
cur=conn.cursor()
cur.execute("SELECT proname FROM pg_proc WHERE proname='rpc_bulk_upsert_properties_v2';")
print(cur.fetchall())
cur.close()
conn.close()
