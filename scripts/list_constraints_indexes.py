import psycopg2, json
uri='postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
conn=psycopg2.connect(uri); cur=conn.cursor();
cur.execute("SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.scraped_properties'::regclass;")
cons = cur.fetchall()
cur.execute("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='scraped_properties';")
idx = cur.fetchall()
print('CONSTRAINTS:')
print(json.dumps(cons, indent=2, default=str))
print('INDEXES:')
print(json.dumps(idx, indent=2, default=str))
cur.close(); conn.close()
