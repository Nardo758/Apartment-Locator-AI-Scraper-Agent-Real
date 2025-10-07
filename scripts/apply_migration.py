import os
import sys
import psycopg2

# Load .env.local if present
def load_env_local():
    path = '.env.local'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

load_env_local()
uri = os.getenv('POSTGRES_URI')
if not uri:
    print('POSTGRES_URI not set in env or .env.local')
    sys.exit(1)

print('Connecting to', uri[:60] + '...')
conn = psycopg2.connect(uri)
cur = conn.cursor()

sql_file = 'supabase/migrations/20251006120000_create_property_discovery_and_upsert.sql'
if not os.path.exists(sql_file):
    print('Migration file not found:', sql_file)
    sys.exit(1)

with open(sql_file, 'r', encoding='utf-8') as f:
    sql_text = f.read()

print('Applying', sql_file)
try:
    cur.execute(sql_text)
    conn.commit()
    print('Migration applied successfully')
except Exception as e:
    print('ERROR applying migration:', e)
    conn.rollback()
finally:
    cur.close()
    conn.close()
