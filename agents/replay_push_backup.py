#!/usr/bin/env python3
"""Replay a saved push backup (agents/backups/push_*.json) to Supabase.

Usage:
  python agents/replay_push_backup.py --backup agents/backups/push_20251004T....json [--dry-run]

If --dry-run is provided, the script will only print summary information and not call Supabase.
If --push is provided (default absent), the script will call the RPC using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
"""
import os
import json
import argparse
import datetime

try:
    from agents.push_scrape_to_supabase import call_supabase_rpc
except Exception:
    # fallback: import as local module
    from push_scrape_to_supabase import call_supabase_rpc


def load_backup(path: str) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--backup', '-b', required=True, help='Path to push backup JSON')
    ap.add_argument('--dry-run', action='store_true', help='Do not call Supabase, just print summary')
    ap.add_argument('--rpc', help='Override rpc name from backup')
    ap.add_argument('--push', action='store_true', help='Actually call Supabase RPC')
    args = ap.parse_args()

    if not os.path.exists(args.backup):
        print('Backup file not found:', args.backup)
        raise SystemExit(2)

    b = load_backup(args.backup)
    items = b.get('items') or b.get('payloads') or []
    rpc_name = args.rpc or b.get('rpc') or 'rpc_bulk_upsert_properties'

    print(f'Loaded backup: {args.backup}')
    print(f'RPC: {rpc_name}  items: {len(items)}')

    if args.dry_run or not args.push:
        # Just summarize
        sample = items[:3]
        print('Sample items:')
        print(json.dumps(sample, indent=2, ensure_ascii=False))
        print('\nDry-run/summary complete. Use --push to actually send to Supabase.')
        return

    # Require env vars
    supabase_url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY')
    if not supabase_url or not service_key:
        print('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required to push')
        raise SystemExit(3)

    print('Calling Supabase RPC...')
    res = call_supabase_rpc(supabase_url, service_key, rpc_name, items)
    print(json.dumps(res, indent=2, ensure_ascii=False))

    # Save a replay backup with response
    backups_dir = os.path.join(os.path.dirname(__file__), 'backups')
    os.makedirs(backups_dir, exist_ok=True)
    ts = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    replay_path = os.path.join(backups_dir, f'replay_{ts}.json')
    try:
        with open(replay_path, 'w', encoding='utf-8') as rf:
            json.dump({'replayed_from': args.backup, 'rpc': rpc_name, 'items_count': len(items), 'result': res}, rf, indent=2, ensure_ascii=False)
        print('Saved replay backup to:', replay_path)
    except Exception as e:
        print('Failed to write replay backup:', e)


if __name__ == '__main__':
    main()
