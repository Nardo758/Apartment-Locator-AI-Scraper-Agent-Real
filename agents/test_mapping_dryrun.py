#!/usr/bin/env python3
"""Quick test to verify mapping/dry-run behavior for push_scrape_to_supabase.build_payloads

Usage:
  python agents/test_mapping_dryrun.py --file agents/live_results/https_highlandsatsweetwatercreek_com_/scrape_result.json
"""
import json
import argparse

from push_scrape_to_supabase import build_payloads


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', '-f', required=True)
    args = ap.parse_args()

    with open(args.file, 'r', encoding='utf-8') as f:
        s = json.load(f)

    mapped = build_payloads(s, improved=True)
    print('Mapped count:', len(mapped))
    # simple sanity checks
    assert isinstance(mapped, list)
    assert len(mapped) > 0
    for m in mapped:
        assert 'property_id' in m
        assert 'unit_number' in m
        assert 'current_price' in m

    print('Mapping test passed')


if __name__ == '__main__':
    main()
