#!/usr/bin/env python3
import json
import psycopg

DB = "postgresql://postgres.jdymvpasjsdbryatscux:Mama%40%24_5030@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

SQL = '''
SELECT
  external_id,
  unit_number,
  name,
  current_price,
  bedrooms,
  bathrooms,
  square_feet,
  created_at
FROM scraped_properties
WHERE external_id LIKE 'highlandsatsweetwatercreek.com%'
ORDER BY unit_number;
'''

def main():
    try:
        with psycopg.connect(DB) as conn:
            with conn.cursor() as cur:
                cur.execute(SQL)
                cols = [d.name for d in cur.description]
                rows = cur.fetchall()
                out = [dict(zip(cols, r)) for r in rows]
                print(json.dumps(out, default=str, indent=2, ensure_ascii=False))
    except Exception as e:
        print('ERROR:', e)

if __name__ == '__main__':
    main()
