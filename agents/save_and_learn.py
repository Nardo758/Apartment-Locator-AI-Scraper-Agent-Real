import asyncio
import json
import os
from pathlib import Path

from smart_scraper import SmartScraper
from template_manager import TemplateManager

try:
    from push_scrape_to_supabase import build_payloads, call_supabase_rpc
except Exception:
    # allow module import when running from agents/ dir
    from agents.push_scrape_to_supabase import build_payloads, call_supabase_rpc


async def run_and_save(url: str, existing_file: str = None):
    out_root = Path(__file__).resolve().parent / 'live_results' / 'https_highlandsatsweetwatercreek_com_'
    out_root.mkdir(parents=True, exist_ok=True)

    tm = TemplateManager()
    scraper = SmartScraper(template_manager=tm)

    if existing_file:
        # Load existing scrape_result.json instead of running a headful scrape
        try:
            with open(existing_file, 'r', encoding='utf-8') as ef:
                result = json.load(ef)
            print('Loaded existing scrape result from', existing_file)
        except Exception as e:
            print('Failed to load existing scrape_result:', e)
            return
    else:
        result = await scraper.scrape_property(url)

    # Save result
    out_file = out_root / 'scrape_result.json'
    out_file.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print('Saved scrape result to', out_file)

    # Persist a practical learned template based on the successful extraction
    selectors = {
        "unit_selector": "[data-unit]",
        # Use text_content parsing with regex for price and bed/bath as best-effort selectors
        "price_selector": {
            "method": "text_content",
            "regex": r"\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?"
        },
        "bedbath_selector": {
            "method": "text_content",
            "regex": r"(\d+\s*(?:bed|bedroom|br))(?:.*?(\d+\s*(?:bath|bathroom|ba)))?"
        }
    }

    tm.learn_new_template(url, selectors, success_rate=1.0)

    # Save and write the learned template to disk for inspection
    domain = tm._extract_domain(url)
    learned = tm.learned_templates.get(domain)
    if learned:
        learned_file = out_root / 'learned_template.json'
        learned_file.write_text(json.dumps(learned, indent=2), encoding='utf-8')
        print('Saved learned template to', learned_file)
    else:
        print('Failed to record learned template for domain')

    # Build payloads for push and save a local backup
    payloads = build_payloads(result, improved=True)
    # validate and coerce payloads
    try:
        from push_scrape_to_supabase import validate_and_coerce
    except Exception:
        from agents.push_scrape_to_supabase import validate_and_coerce
    cleaned, issues = validate_and_coerce(payloads)
    backups_dir = Path(__file__).resolve().parent / 'backups'
    backups_dir.mkdir(parents=True, exist_ok=True)
    ts = __import__('datetime').datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    backup_path = backups_dir / f'save_and_learn_{ts}.json'
    try:
        with open(backup_path, 'w', encoding='utf-8') as bf:
            json.dump({'scrape_result': result, 'payloads': cleaned, 'validation_issues': issues}, bf, indent=2, ensure_ascii=False)
        print('Saved push backup to', backup_path)
        if issues:
            print('Validation issues found; see backup for details')
    except Exception as e:
        print('Failed to write save_and_learn backup:', e)

    # If Supabase env vars are present, attempt a push (best-effort)
    supabase_url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY')
    if supabase_url and service_key:
        print('SUPABASE env vars detected — attempting best-effort push (backed up locally)')
        try:
            res = call_supabase_rpc(supabase_url, service_key, 'rpc_bulk_upsert_properties', cleaned)
            print('Push result:', res)
            # save response next to backup
            try:
                with open(str(backup_path) + '.response.json', 'w', encoding='utf-8') as rf:
                    json.dump(res, rf, indent=2, ensure_ascii=False)
            except Exception:
                pass
        except Exception as e:
            print('Push attempt failed:', e)
    else:
        print('No SUPABASE env vars found — backup saved, push skipped.')


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-scrape', action='store_true', help='Do not run Playwright scrape; use --file to provide existing scrape_result.json')
    ap.add_argument('--file', '-f', help='Path to existing scrape_result.json to process')
    ap.add_argument('--url', help='Property URL to scrape (default Highlands)')
    args = ap.parse_args()

    url = args.url or "https://highlandsatsweetwatercreek.com"
    existing = args.file if args.no_scrape else None
    asyncio.run(run_and_save(url, existing_file=existing))


if __name__ == '__main__':
    main()
