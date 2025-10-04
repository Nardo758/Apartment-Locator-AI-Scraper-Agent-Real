import psycopg2
uri='postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
conn=psycopg2.connect(uri)
conn.autocommit=True
cur=conn.cursor()
cur.execute("SELECT proname FROM pg_proc WHERE proname='rpc_bulk_upsert_properties_v2';")
print(cur.fetchall())
cur.close()
conn.close()
