import os, psycopg2, sys
uri = 'postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
sql_path = 'supabase/migrations/20251004120000_rpc_bulk_upsert_properties_v2.sql'
print('Reading', sql_path)
with open(sql_path, 'r', encoding='utf-8') as f:
    sql = f.read()
# connect and execute
print('Connecting to DB...')
conn = psycopg2.connect(uri)
conn.autocommit = True
cur = conn.cursor()
try:
    print('Executing migration...')
    cur.execute(sql)
    print('Migration executed successfully')
except Exception as e:
    print('Migration failed:', e)
    sys.exit(2)
# verify function exists
try:
    cur.execute("SELECT proname FROM pg_proc WHERE proname = 'rpc_bulk_upsert_properties_v2';")
    rows = cur.fetchall()
    print('pg_proc rows:', rows)
except Exception as e:
    print('Verification query failed:', e)
# grant execute
try:
    cur.execute("GRANT EXECUTE ON FUNCTION public.rpc_bulk_upsert_properties_v2(jsonb) TO authenticated;")
    print('Granted execute to authenticated')
except Exception as e:
    print('Grant failed (may be OK):', e)
cur.close()
conn.close()
print('Done')
