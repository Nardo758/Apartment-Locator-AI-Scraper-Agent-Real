#!/usr/bin/env python3
"""
Enhanced scraper with Watch and Learn integration
Combines the learning system with the existing rental data scraper
"""

import asyncio
import sys
import json
from pathlib import Path
from typing import List, Dict, Optional

# Add the agents directory to the path
sys.path.insert(0, str(Path(__file__).parent / "agents"))

from agents.learning_system import LearningEnhancedRentalDataAgent, start_learning_session
from agents.simple_success_system import SimpleSuccessSystem, train_on_single_site, learn_from_sites
from agents.scrape_specific_sites import scrape_single_property


async def enhanced_scraper():
    """Enhanced scraper with learning capabilities"""

    print("🤖 Enhanced Rental Data Scraper with Watch and Learn")
    print("=" * 60)

    if len(sys.argv) < 2:
        print("Usage: python enhanced_scraper.py <command> [options]")
        print("\nCommands:")
        print("  learn <url>          - Start learning session for URL")
        print("  train <url>          - Simple training: navigate, press F8 at data")
        print("  train-batch <file>   - Train on multiple URLs from file")
        print("  extract <url>        - Extract with learning enabled")
        print("  extract-no-learn <url> - Extract without learning")
        print("  batch <file>         - Batch process URLs from file")
        print("  interactive          - Interactive mode")
        return

    command = sys.argv[1]

    if command == "learn":
        if len(sys.argv) < 3:
            print("❌ Please provide a URL to learn")
            return

        url = sys.argv[2]
        print(f"🎬 Starting learning session for: {url}")

        try:
            learned_path = await start_learning_session(url)
            if learned_path:
                print("✅ Learning session completed!")
                print(f"📋 Learned {len(learned_path.actions)} actions")
                print(f"🎯 Extracted {len(learned_path.extracted_selectors)} selectors")
            else:
                print("❌ Learning session failed or was cancelled")
        except KeyboardInterrupt:
            print("\n❌ Learning session interrupted")
        except Exception as e:
            print(f"❌ Error during learning: {e}")

    elif command == "train":
        if len(sys.argv) < 3:
            print("❌ Please provide a URL to train on")
            return

        url = sys.argv[2]
        print(f"🎯 Starting simple training for: {url}")
        print("Instructions:")
        print("1. Browser will open the website")
        print("2. Navigate to find rental data manually")
        print("3. Press F8 when you see rental prices/units")
        print("4. The system will capture the page state")
        print()

        try:
            success_data = await train_on_single_site(url)
            if success_data:
                print("\n✅ Training successful!")
                print("📊 Captured data:")
                print(f"   URL: {success_data.current_url}")
                print(f"   Title: {success_data.page_title}")
                print(f"   💰 Prices: {success_data.prices_found}")
                print(f"   🏠 Units: {success_data.units_found}")
            else:
                print("\n❌ Training failed - no data captured")
        except KeyboardInterrupt:
            print("\n⏹️  Training cancelled")
        except Exception as e:
            print(f"\n❌ Training error: {e}")

    elif command == "train-batch":
        if len(sys.argv) < 3:
            print("❌ Please provide a file with URLs")
            return

        file_path = sys.argv[2]
        if not Path(file_path).exists():
            print(f"❌ File not found: {file_path}")
            return

        print(f"🎯 Batch training from: {file_path}")
        try:
            with open(file_path, 'r') as f:
                urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]

            print(f"📋 Training on {len(urls)} sites")
            print("For each site: navigate to data, press F8 when ready")
            print()

            results = await learn_from_sites(urls)
            print(f"\n✅ Completed training on {len(results)} sites")

        except KeyboardInterrupt:
            print("\n⏹️  Batch training cancelled")
        except Exception as e:
            print(f"\n❌ Batch training error: {e}")

    elif command == "extract":
        if len(sys.argv) < 3:
            print("❌ Please provide a URL to extract")
            return

        url = sys.argv[2]
        print(f"🧠 Extracting with learning enabled: {url}")

        agent = LearningEnhancedRentalDataAgent()
        results = await agent.extract_rental_data_with_learning(url, enable_learning=True)

        print(f"📊 Found {len(results)} rental units")
        if results:
            for i, unit in enumerate(results[:5]):  # Show first 5
                price = unit.get('price', 'N/A')
                bedrooms = unit.get('bedrooms', 'N/A')
                bathrooms = unit.get('bathrooms', 'N/A')
                sqft = unit.get('sqft', 'N/A')
                print(f"  {i+1}. {price} - {bedrooms} bed, {bathrooms} bath, {sqft} sqft")

    elif command == "extract-no-learn":
        if len(sys.argv) < 3:
            print("❌ Please provide a URL to extract")
            return

        url = sys.argv[2]
        print(f"⚡ Extracting without learning: {url}")

        # Use the original scraper
        results = await scrape_single_property(url)
        print(f"📊 Found {len(results)} rental units")

    elif command == "batch":
        if len(sys.argv) < 3:
            print("❌ Please provide a file with URLs")
            return

        file_path = sys.argv[2]
        if not Path(file_path).exists():
            print(f"❌ File not found: {file_path}")
            return

        print(f"📂 Processing URLs from: {file_path}")

        with open(file_path, 'r') as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]

        print(f"📋 Found {len(urls)} URLs to process")

        agent = LearningEnhancedRentalDataAgent()
        total_units = 0

        for i, url in enumerate(urls, 1):
            print(f"\n🏢 [{i}/{len(urls)}] Processing: {url}")
            try:
                results = await agent.extract_rental_data_with_learning(url, enable_learning=True)
                units_found = len(results)
                total_units += units_found
                print(f"   ✅ Found {units_found} units")
            except Exception as e:
                print(f"   ❌ Error: {e}")

        print(f"\n🎉 Batch processing complete! Total units found: {total_units}")

    elif command == "interactive":
        await interactive_mode()

    else:
        print(f"❌ Unknown command: {command}")


async def interactive_mode():
    """Interactive mode for the enhanced scraper"""

    print("🎮 Interactive Enhanced Scraper Mode")
    print("Commands:")
    print("  learn <url>     - Learn navigation for a URL")
    print("  train <url>     - Simple training: navigate, press F8 at data")
    print("  train-batch <file> - Train on multiple URLs from file")
    print("  extract <url>   - Extract data from a URL")
    print("  batch <file>    - Process URLs from file")
    print("  help            - Show this help")
    print("  quit            - Exit interactive mode")

    agent = LearningEnhancedRentalDataAgent()

    while True:
        try:
            cmd = input("\n🎯 enhanced-scraper> ").strip()

            if not cmd:
                continue

            if cmd == "quit" or cmd == "exit":
                print("👋 Goodbye!")
                break

            if cmd == "help":
                print("Commands:")
                print("  learn <url>     - Learn navigation for a URL")
                print("  extract <url>   - Extract data from a URL")
                print("  batch <file>    - Process URLs from file")
                print("  help            - Show this help")
                print("  quit            - Exit interactive mode")
                continue

            parts = cmd.split()
            command = parts[0]

            if command == "learn":
                if len(parts) < 2:
                    print("❌ Please provide a URL")
                    continue
                url = parts[1]
                print(f"🎬 Learning navigation for: {url}")
                learned_path = await start_learning_session(url)
                if learned_path:
                    print(f"✅ Learned {len(learned_path.actions)} actions")

            elif command == "train":
                if len(parts) < 2:
                    print("❌ Please provide a URL")
                    continue
                url = parts[1]
                print(f"🎯 Simple training for: {url}")
                print("Navigate to rental data, then press F8")

                try:
                    success_data = await train_on_single_site(url)
                    if success_data:
                        print("✅ Training successful!")
                        print(f"📊 Found {len(success_data.prices_found)} prices, {len(success_data.units_found)} units")
                except KeyboardInterrupt:
                    print("⏹️  Training cancelled")

            elif command == "train-batch":
                if len(parts) < 2:
                    print("❌ Please provide a file path")
                    continue
                file_path = parts[1]
                if not Path(file_path).exists():
                    print(f"❌ File not found: {file_path}")
                    continue

                print(f"🎯 Batch training from: {file_path}")
                with open(file_path, 'r') as f:
                    urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]

                print(f"📋 Training on {len(urls)} sites")
                try:
                    results = await learn_from_sites(urls)
                    print(f"✅ Completed training on {len(results)} sites")
                except KeyboardInterrupt:
                    print("⏹️  Batch training cancelled")

            elif command == "extract":
                if len(parts) < 2:
                    print("❌ Please provide a URL")
                    continue
                url = parts[1]
                print(f"🧠 Extracting from: {url}")
                results = await agent.extract_rental_data_with_learning(url, enable_learning=True)
                print(f"📊 Found {len(results)} units")

            elif command == "batch":
                if len(parts) < 2:
                    print("❌ Please provide a file path")
                    continue
                file_path = parts[1]
                if not Path(file_path).exists():
                    print(f"❌ File not found: {file_path}")
                    continue

                print(f"📂 Processing batch file: {file_path}")
                with open(file_path, 'r') as f:
                    urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]

                total_units = 0
                for url in urls:
                    print(f"  Processing: {url}")
                    results = await agent.extract_rental_data_with_learning(url, enable_learning=True)
                    units_found = len(results)
                    total_units += units_found
                    print(f"    Found {units_found} units")

                print(f"🎉 Total units found: {total_units}")

            else:
                print(f"❌ Unknown command: {command}")

        except KeyboardInterrupt:
            print("\n❌ Interrupted")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(enhanced_scraper())
    except KeyboardInterrupt:
        print("\n👋 Enhanced scraper stopped")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)