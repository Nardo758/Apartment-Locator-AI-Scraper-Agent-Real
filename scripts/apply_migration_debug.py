import psycopg2, sys, os
uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI') or ''
if not uri:
    print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to run this debug script.')
    sys.exit(1)
sql_path = 'supabase/migrations/20251004120000_rpc_bulk_upsert_properties_v2.sql'
with open(sql_path, 'r', encoding='utf-8') as f:
    sql = f.read()
conn = psycopg2.connect(uri)
conn.autocommit = True
cur = conn.cursor()
try:
    cur.execute(sql)
    print('OK')
except Exception as e:
    print('Exception:', type(e), e)
    try:
        print('pgerror:', e.pgerror)
    except Exception:
        pass
    try:
        print('diag message_primary:', e.diag.message_primary)
        print('diag statement_position:', e.diag.statement_position)
    except Exception:
        pass
    # show surrounding SQL around error position if available
    try:
        pos = int(e.diag.statement_position)
        print('Error position:', pos)
        start = max(0, pos-80)
        end = pos+80
        print(sql[start:end])
    except Exception:
        pass
finally:
    cur.close()
    conn.close()
