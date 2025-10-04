#!/usr/bin/env python3
import psycopg
url = "postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
with psycopg.connect(url) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT column_name, is_nullable, data_type, column_default FROM information_schema.columns WHERE table_name='scraped_properties' ORDER BY ordinal_position")
        rows = cur.fetchall()
        for r in rows:
            print(r)
