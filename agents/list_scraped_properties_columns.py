#!/usr/bin/env python3
import psycopg, os, sys
url = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not url:
    print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set')
    sys.exit(1)
with psycopg.connect(url) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT column_name, is_nullable, data_type, column_default FROM information_schema.columns WHERE table_name='scraped_properties' ORDER BY ordinal_position")
        rows = cur.fetchall()
        for r in rows:
            print(r)
