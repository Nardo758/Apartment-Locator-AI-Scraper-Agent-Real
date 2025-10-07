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

import glob
import pathlib

MIGRATIONS_DIR = 'supabase/migrations'

def discover_migrations():
    """Discover .sql migration files under supabase/migrations and return a sorted list."""
    p = pathlib.Path(MIGRATIONS_DIR)
    if not p.exists():
        return []
    files = [str(x).replace('\\','/') for x in sorted(p.glob('*.sql'))]
    return files


def read_sql(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def main():
    uri = os.getenv('POSTGRES_URI') or os.getenv('STAGING_POSTGRES_URI')
    if not uri:
        print('Error: POSTGRES_URI or STAGING_POSTGRES_URI environment variable must be set to apply migrations.')
        sys.exit(1)
    # CLI flags
    confirm = os.getenv('YES') == '1' or '--yes' in sys.argv or '-y' in sys.argv
    list_only = '--list' in sys.argv
    dry_run = '--dry-run' in sys.argv

    migrations = discover_migrations()
    if not migrations:
        print('No migration files found in', MIGRATIONS_DIR)
        sys.exit(0)

    print('Migrations to apply (%d):' % len(migrations))
    for m in migrations:
        print('  ', m)

    if list_only:
        print('\nList-only mode; exiting without applying migrations.')
        sys.exit(0)

    if dry_run:
        print('\nDry-run mode; not executing SQL. Use --yes to run for real.')
        sys.exit(0)

    if not confirm:
        print('\nAbout to apply migrations to:', uri)
        ans = input('Proceed? (type YES to continue) ')
        if ans.strip() != 'YES':
            print('Aborted by user')
            sys.exit(1)

    conn = None
    try:
        conn = psycopg2.connect(uri)
        conn.autocommit = True
        cur = conn.cursor()

        for mig in migrations:
            print('\n--- Applying', mig)
            try:
                sql_text = read_sql(mig)
            except Exception as e:
                print('ERROR reading', mig)
                print(e)
                cur.close()
                conn.close()
                sys.exit(2)

            try:
                cur.execute(sql_text)
                print('OK')
            except Exception as e:
                print('ERROR applying', mig)
                # Print a concise error message and the SQLSTATE if available
                try:
                    print('Error:', e)
                except:
                    print('Error applying migration (exception printing failed)')
                cur.close()
                conn.close()
                sys.exit(2)

        cur.close()
        conn.close()
        print('\nAll migrations applied successfully')
    except Exception as e:
        print('Failed to connect or apply migrations:', e)
        if conn:
            try:
                conn.close()
            except:
                pass
        sys.exit(3)


if __name__ == '__main__':
    main()
