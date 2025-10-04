"""
Apply migration SQL files to a Postgres database using psycopg2.

Usage:
  - Set environment variable POSTGRES_URI to your staging Postgres connection string.
  - Run: python scripts/apply_migrations_to_staging.py

Safety: This script will prompt before executing if the --yes flag is not provided.
"""
import os
import sys
import psycopg2
from psycopg2 import sql

MIGRATIONS = [
    'supabase/migrations/20251004130000_add_scraped_properties_fields_and_index.sql',
    'supabase/migrations/20251004131000_add_missing_apartments_columns.sql',
    'supabase/migrations/20251004120000_rpc_bulk_upsert_properties_v2.sql',
    'supabase/migrations/20251004132000_rpc_merge_apartments_into_scraped.sql'
]


def read_sql(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def main():
    uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI')
    if not uri:
        print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to apply migrations.')
        sys.exit(1)

    confirm = os.getenv('YES') == '1' or '--yes' in sys.argv
    if not confirm:
        print('About to apply migrations to:', uri)
        ans = input('Proceed? (type YES to continue) ')
        if ans.strip() != 'YES':
            print('Aborted by user')
            sys.exit(1)

    conn = psycopg2.connect(uri)
    conn.autocommit = True
    cur = conn.cursor()

    for mig in MIGRATIONS:
        print('\n--- Applying', mig)
        sql_text = read_sql(mig)
        try:
            cur.execute(sql_text)
            print('OK')
        except Exception as e:
            print('ERROR applying', mig)
            print(e)
            cur.close()
            conn.close()
            sys.exit(2)

    cur.close()
    conn.close()
    print('\nAll migrations applied successfully')


if __name__ == '__main__':
    main()
