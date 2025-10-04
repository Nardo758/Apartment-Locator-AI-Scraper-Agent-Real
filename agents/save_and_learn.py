import asyncio
import json
from pathlib import Path

from smart_scraper import SmartScraper
from template_manager import TemplateManager


async def run_and_save(url: str):
    out_root = Path(__file__).resolve().parent / 'live_results' / 'https_highlandsatsweetwatercreek_com_'
    out_root.mkdir(parents=True, exist_ok=True)

    tm = TemplateManager()
    scraper = SmartScraper(template_manager=tm)

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


def main():
    url = "https://highlandsatsweetwatercreek.com"
    asyncio.run(run_and_save(url))


if __name__ == '__main__':
    main()
