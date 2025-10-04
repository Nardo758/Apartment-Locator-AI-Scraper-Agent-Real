#!/usr/bin/env python3
import argparse
import asyncio
import sys
from pathlib import Path
# Ensure repo root added so we can import agents as a module when running the script directly
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from smart_scraper import SmartScraper


async def run(url, headful=False):
    scraper = SmartScraper()
    # create a browser context with headful as appropriate
    # SmartScraper creates its own context; headful flag is currently respected in _create_browser_context
    result = await scraper.scrape_property(url)
    print('=== RESULT ===')
    import json
    print(json.dumps(result, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True)
    parser.add_argument('--headful', action='store_true')
    args = parser.parse_args()
    asyncio.run(run(args.url, headful=args.headful))


if __name__ == '__main__':
    main()
