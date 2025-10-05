import psycopg2, json, os, sys
uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not uri:
	print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to run list_constraints_indexes.py')
	sys.exit(1)
conn = psycopg2.connect(uri); cur = conn.cursor();
cur.execute("SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.scraped_properties'::regclass;")
cons = cur.fetchall()
cur.execute("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='scraped_properties';")
idx = cur.fetchall()
print('CONSTRAINTS:')
print(json.dumps(cons, indent=2, default=str))
print('INDEXES:')
print(json.dumps(idx, indent=2, default=str))
cur.close(); conn.close()
