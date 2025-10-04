import psycopg2, json
uri='postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
conn=psycopg2.connect(uri)
conn.autocommit=True
cur=conn.cursor()
cur.execute("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='scraped_properties' ORDER BY ordinal_position;")
rows=cur.fetchall()
print(json.dumps(rows, indent=2))
cur.close()
conn.close()
