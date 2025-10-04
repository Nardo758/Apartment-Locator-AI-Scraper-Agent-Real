import psycopg2
uri='postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
conn=psycopg2.connect(uri)
conn.autocommit=True
cur=conn.cursor()
cur.execute("ALTER TABLE public.scraped_properties ADD COLUMN IF NOT EXISTS ai_provider text;")
cur.execute("ALTER TABLE public.scraped_properties ADD COLUMN IF NOT EXISTS ai_raw jsonb;")
print('columns added')
cur.close()
conn.close()
