import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

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
    print('POSTGRES_URI not set in environment or .env.local')
    sys.exit(1)

if len(sys.argv) < 2:
    print('Usage: python query_sql.py "SELECT ..."')
    sys.exit(1)

sql = sys.argv[1]
try:
    conn = psycopg2.connect(uri)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(sql)
    rows = cur.fetchall()
    for r in rows:
        print(r)
    cur.close()
    conn.close()
except Exception as e:
    print('ERROR executing query:', e)
    sys.exit(1)
