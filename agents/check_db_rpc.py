#!/usr/bin/env python3
"""Check Postgres DB for existence of a function (RPC) in public schema.

Usage:
  python agents/check_db_rpc.py "postgresql://..." rpc_bulk_upsert_properties

This script is read-only: it will NOT execute any migrations or alter the DB.
"""
import sys
from typing import Optional

def main():
    if len(sys.argv) < 3:
        print('Usage: python agents/check_db_rpc.py <DATABASE_URL> <function_name>')
        sys.exit(2)
    db_url = sys.argv[1]
    func_name = sys.argv[2]

    try:
        import psycopg
    except Exception:
        print('psycopg not installed. Please run: python -m pip install psycopg[binary]')
        sys.exit(3)

    try:
        # connect
        conn = psycopg.connect(db_url)
    except Exception as e:
        print('Failed to connect to database:', e)
        sys.exit(4)

    try:
        with conn.cursor() as cur:
            # search for function in public schema
            cur.execute(
                """
                SELECT p.proname, pg_get_functiondef(p.oid) as definition
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public' AND p.proname = %s
                ORDER BY p.proname
                """,
                (func_name,)
            )
            rows = cur.fetchall()
            if not rows:
                print('NOT FOUND')
                sys.exit(0)
            print('FOUND', len(rows))
            for r in rows:
                name, definition = r
                print('\n--- FUNCTION:', name, '---')
                print(definition)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
