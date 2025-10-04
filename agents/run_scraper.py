#!/usr/bin/env python3
import sys
import asyncio
from huntley_relational_scraper import HuntleyRelationalScraper


async def main():
    url = None
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        print("Usage: python run_scraper.py <url>")
        return

    scraper = HuntleyRelationalScraper()
    try:
        result = await scraper.huntley_relational_scrape(target_url=url)
        if result:
            print("Scrape finished. Result keys:", list(result.keys()))
    except Exception as e:
        print("Scraper error:", e)


if __name__ == '__main__':
    asyncio.run(main())
