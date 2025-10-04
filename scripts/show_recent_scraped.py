import psycopg2, json
uri='postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
conn=psycopg2.connect(uri); cur=conn.cursor();
cur.execute("SELECT external_id, property_id, unit_number, current_price, created_at, updated_at FROM public.scraped_properties ORDER BY updated_at DESC LIMIT 5;")
print(json.dumps(cur.fetchall(), default=str, indent=2))
cur.close(); conn.close()
