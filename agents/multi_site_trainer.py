#!/usr/bin/env python3
"""
Multi-Site Training Script for Rental Data Scraper
Train the AI on multiple rental websites from a provided list.
"""

import asyncio
import sys
import os
from typing import List, Optional
from cloudflare_success_system import CloudflareSuccessSystem, SuccessSignal
import json
from datetime import datetime


class MultiSiteTrainer:
    """Train on multiple rental websites"""

    def __init__(self):
        self.system = CloudflareSuccessSystem()
        self.learned_patterns = []

    async def train_on_multiple_sites(self, urls: List[str]) -> List[SuccessSignal]:
        """Train on multiple websites sequentially"""
        print("🎯 Starting Multi-Site Training Session")
        print(f"📋 Training on {len(urls)} websites")
        print("Instructions for each site:")
        print("  1. Browser will open the website")
        print("  2. Navigate to find rental prices/units")
        print("  3. Press F8 when you find the data you want to learn")
        print("  4. Press Ctrl+C to skip a site")
        print("  5. Training will move to next site automatically")
        print("=" * 60)

        successful_learnings = []

        for i, url in enumerate(urls, 1):
            print(f"\n🏢 [{i}/{len(urls)}] Training on: {url}")
            print("-" * 50)

            try:
                # Train on this site
                success_data = await self.system.train_on_website(url)

                if success_data:
                    successful_learnings.append(success_data)
                    print(f"✅ Successfully learned from {url}")

                    # Save individual site data
                    self._save_individual_pattern(success_data, i)

                else:
                    print(f"⚠️  No pattern learned from {url}")

            except KeyboardInterrupt:
                print(f"\n⏭️  Skipping {url}")
                continue
            except Exception as e:
                print(f"❌ Error training on {url}: {e}")
                continue

            # Brief pause between sites
            if i < len(urls):
                print("⏳ Preparing next site in 3 seconds...")
                await asyncio.sleep(3)

        # Save consolidated results
        self._save_consolidated_results(successful_learnings)

        print("\n🎉 Multi-site training complete!")
        print(f"📊 Successfully learned patterns from {len(successful_learnings)} out of {len(urls)} sites")

        return successful_learnings

    def _save_individual_pattern(self, success_data: SuccessSignal, site_number: int):
        """Save pattern for individual site"""
        try:
            # Extract domain from URL for filename
            domain = success_data.url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]

            filename = f"learned_{domain}_{site_number}.json"
            filepath = os.path.join(os.getcwd(), filename)

            # Create pattern data
            pattern_data = {
                "session_info": {
                    "url": success_data.url,
                    "timestamp": success_data.timestamp,
                    "site_number": site_number
                },
                "extracted_data": {
                    "page_title": success_data.page_title,
                    "current_url": success_data.current_url,
                    "prices_found": success_data.prices_found,
                    "units_found": success_data.units_found
                },
                "learned_patterns": self._extract_patterns_from_data(success_data)
            }

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(pattern_data, f, indent=2, ensure_ascii=False)

            print(f"💾 Saved individual pattern: {filename}")

        except Exception as e:
            print(f"⚠️  Error saving individual pattern: {e}")

    def _save_consolidated_results(self, successful_learnings: List[SuccessSignal]):
        """Save consolidated results from all sites"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"multi_site_training_{timestamp}.json"
            filepath = os.path.join(os.getcwd(), filename)

            consolidated = {
                "training_session": {
                    "timestamp": datetime.now().isoformat(),
                    "total_sites_attempted": len(successful_learnings),
                    "sites": []
                },
                "consolidated_patterns": {
                    "all_prices": [],
                    "all_units": [],
                    "common_selectors": [],
                    "learned_regex_patterns": []
                }
            }

            # Collect data from all sites
            all_prices = set()
            all_units = set()

            for success_data in successful_learnings:
                site_info = {
                    "url": success_data.url,
                    "title": success_data.page_title,
                    "prices_count": len(success_data.prices_found),
                    "units_count": len(success_data.units_found),
                    "prices": success_data.prices_found,
                    "units": success_data.units_found
                }
                consolidated["training_session"]["sites"].append(site_info)

                # Collect unique prices and units
                all_prices.update(success_data.prices_found)
                all_units.update(success_data.units_found)

            consolidated["consolidated_patterns"]["all_prices"] = list(all_prices)
            consolidated["consolidated_patterns"]["all_units"] = list(all_units)

            # Extract common patterns
            consolidated["consolidated_patterns"]["learned_regex_patterns"] = self._extract_common_patterns(successful_learnings)

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(consolidated, f, indent=2, ensure_ascii=False)

            print(f"💾 Saved consolidated results: {filename}")

        except Exception as e:
            print(f"⚠️  Error saving consolidated results: {e}")

    def _extract_patterns_from_data(self, success_data: SuccessSignal) -> dict:
        """Extract regex patterns from successful data"""
        patterns = {}

        # Price pattern
        if success_data.prices_found:
            import re
            # Look for common price formats
            price_texts = " ".join(success_data.prices_found[:5])  # Use first 5 prices
            if re.search(r'\$[\d,]+(?:\.\d{2})?', price_texts):
                patterns["price_pattern"] = r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month)?'

        # Unit pattern
        if success_data.units_found:
            unit_texts = " ".join(success_data.units_found[:5]).lower()
            if "bedroom" in unit_texts or "studio" in unit_texts:
                patterns["unit_pattern"] = r'(\d+)\s*bedroom|\bstudio\b|\b(\d+)\s*br\b'

        # Square footage pattern
        if any("sq ft" in unit.lower() or "sqft" in unit.lower() for unit in success_data.units_found):
            patterns["sqft_pattern"] = r'(\d+(?:,?\d+)?)\s*sq\s*ft|\b(\d+(?:,?\d+)?)\s*sqft\b'

        return patterns

    def _extract_common_patterns(self, successful_learnings: List[SuccessSignal]) -> List[str]:
        """Extract common patterns across all sites"""
        patterns = []

        # Common price patterns
        patterns.append(r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month|\s*monthly)?')

        # Common unit patterns
        patterns.append(r'(\d+)\s*bedroom|\bstudio\b|\b(\d+)\s*br\b')
        patterns.append(r'(\d+)\s*bathroom|\b(\d+)\s*ba\b')

        # Square footage
        patterns.append(r'(\d+(?:,?\d+)?)\s*sq\s*ft|\b(\d+(?:,?\d+)?)\s*sqft\b')

        return patterns


async def main():
    """Main training function"""
    # List of Atlanta-area rental websites
    urls = [
        "https://www.belldecatur.com",
        "https://www.churchstreetstation.com",
        "https://www.artisanoakhurst.com",
        "https://www.krogstreetlofts.com",
        "https://www.viningsvillage.com",
        "https://www.clubatvinings.com",
        "https://www.riversideclub.com"
    ]

    print("🏙️  Atlanta Rental Sites Multi-Training Program (Cloudflare Bypass)")
    print("=" * 60)
    print(f"📋 Will train on {len(urls)} Atlanta-area rental websites:")
    for i, url in enumerate(urls, 1):
        print(f"   {i}. {url}")
    print()
    print("🛡️  Cloudflare Protection: This system includes stealth techniques")
    print("   to bypass Cloudflare security challenges automatically")
    print()
    print("🎯 Instructions:")
    print("   • For each site: Browser will handle Cloudflare, then navigate to rental data")
    print("   • Press F8 when you find the rental prices/units you want to learn")
    print("   • Press Ctrl+C to skip a site")
    print("   • Training moves automatically between sites")
    print("   • Results saved to JSON files")
    print()

    # Confirm before starting
    try:
        input("Press Enter to start training, or Ctrl+C to cancel...")
    except KeyboardInterrupt:
        print("\n👋 Training cancelled")
        return

    # Start training
    trainer = MultiSiteTrainer()

    try:
        results = await trainer.train_on_multiple_sites(urls)

        print("\n🎊 Training Session Summary:")
        print(f"   ✅ Sites trained: {len(results)}")
        print(f"   📄 Pattern files saved: {len(results)} individual + 1 consolidated")
        print("   📊 Check the generated JSON files for learned patterns")

        if results:
            print("\n📈 Top learned patterns:")
            total_prices = sum(len(r.prices_found) for r in results)
            total_units = sum(len(r.units_found) for r in results)
            print(f"   💰 Total prices captured: {total_prices}")
            print(f"   🏠 Total units captured: {total_units}")

    except KeyboardInterrupt:
        print("\n👋 Training interrupted by user")
    except Exception as e:
        print(f"\n❌ Training error: {e}")


if __name__ == "__main__":
    asyncio.run(main())