import psycopg2
uri='postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
conn=psycopg2.connect(uri); conn.autocommit=True; cur=conn.cursor()
try:
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_properties_prop_unit_unique ON public.scraped_properties (property_id, unit_number);")
    print('unique index created')
except Exception as e:
    print('index creation failed:', e)
cur.close(); conn.close()
