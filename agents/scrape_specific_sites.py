#!/usr/bin/env python3
"""
Scrape Specific Apartment Websites

Scrapes the provided apartment websites using the template-based scraping system
and pushes the data to Supabase.
"""

import asyncio
import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

from rental_data_agent import RentalDataAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Target websites to scrape
TARGET_URLS = [
    "https://www.thehuntley.com/",
    "https://www.hanoverbuckheadvillage.com/",
    "https://altaporter.com/"
]

async def scrape_single_property(url: str, agent: RentalDataAgent) -> Dict[str, Any]:
    """
    Scrape a single property URL and return the results.

    Args:
        url: Property URL to scrape
        agent: RentalDataAgent instance

    Returns:
        Dictionary with scraping results
    """
    logger.info(f"🔍 Starting scrape for: {url}")

    try:
        # Extract rental data
        rental_data = await agent.extract_rental_data(url)

        result = {
            "url": url,
            "success": len(rental_data) > 0,
            "units_found": len(rental_data),
            "data": rental_data,
            "timestamp": datetime.now().isoformat(),
            "error": None
        }

        if result["success"]:
            logger.info(f"✅ Successfully scraped {len(rental_data)} units from {url}")
        else:
            logger.warning(f"⚠️ No data extracted from {url}")

        return result

    except Exception as e:
        logger.error(f"❌ Failed to scrape {url}: {str(e)}")
        return {
            "url": url,
            "success": False,
            "units_found": 0,
            "data": [],
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

async def save_to_supabase(agent: RentalDataAgent, all_results: List[Dict[str, Any]]) -> bool:
    """
    Save scraping results to Supabase.

    Args:
        agent: RentalDataAgent with Supabase connection
        all_results: List of scraping results

    Returns:
        True if successful, False otherwise
    """
    if not agent.supabase:
        logger.warning("⚠️ Supabase not configured, skipping database save")
        return False

    try:
        successful_saves = 0
        total_units = 0

        for result in all_results:
            if not result["success"] or not result["data"]:
                continue

            property_url = result["url"]
            units_data = result["data"]

            # Extract property ID from URL or use URL as identifier
            property_id = hash(property_url) % 1000000  # Simple hash for property ID

            for unit in units_data:
                try:
                    # Prepare data for Supabase
                    supabase_data = {
                        "property_id": property_id,
                        "property_url": property_url,
                        "floorplan_name": unit.get("floorplan_name", ""),
                        "bedrooms": unit.get("bedrooms", 0),
                        "bathrooms": unit.get("bathrooms", 0.0),
                        "sqft": unit.get("sqft"),
                        "monthly_rent": unit.get("monthly_rent", 0.0),
                        "lease_term_months": unit.get("lease_term_months", 12),
                        "lease_term": unit.get("lease_term"),
                        "concessions": unit.get("concessions"),
                        "availability_date": unit.get("availability_date"),
                        "availability_status": unit.get("availability_status", "available"),
                        "confidence_score": unit.get("confidence_score", 0.0),
                        "data_source": unit.get("data_source", "template_scraper"),
                        "raw_data": json.dumps(unit.get("raw_data", {})),
                        "scraped_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }

                    # Insert into Supabase
                    response = agent.supabase.table("rental_data").insert(supabase_data).execute()

                    if response.data:
                        successful_saves += 1
                        total_units += 1
                        logger.info(f"💾 Saved unit: {unit.get('floorplan_name', 'Unknown')} - ${unit.get('monthly_rent', 0)}")

                except Exception as e:
                    logger.error(f"❌ Failed to save unit data: {str(e)}")
                    continue

        logger.info(f"✅ Successfully saved {successful_saves} units to Supabase")
        return successful_saves > 0

    except Exception as e:
        logger.error(f"❌ Failed to save to Supabase: {str(e)}")
        return False

async def main():
    """Main scraping function"""
    logger.info("🚀 Starting apartment website scraping with template system")
    logger.info(f"📋 Target URLs: {len(TARGET_URLS)}")

    # Initialize the rental data agent
    logger.info("🔧 Initializing Rental Data Agent...")
    agent = RentalDataAgent()

    # Check if Supabase is configured
    if agent.supabase:
        logger.info("✅ Supabase connection configured")
    else:
        logger.warning("⚠️ Supabase not configured - data will not be saved to database")

    all_results = []

    # Scrape each property
    for i, url in enumerate(TARGET_URLS, 1):
        logger.info(f"\n{'='*60}")
        logger.info(f"🏢 Property {i}/{len(TARGET_URLS)}: {url}")
        logger.info(f"{'='*60}")

        result = await scrape_single_property(url, agent)
        all_results.append(result)

        # Small delay between scrapes to be respectful
        if i < len(TARGET_URLS):
            logger.info("⏳ Waiting 3 seconds before next property...")
            await asyncio.sleep(3)

    # Save results to Supabase
    logger.info(f"\n{'='*60}")
    logger.info("💾 SAVING TO SUPABASE")
    logger.info(f"{'='*60}")

    supabase_success = await save_to_supabase(agent, all_results)

    # Generate summary report
    logger.info(f"\n{'='*60}")
    logger.info("📊 SCRAPING SUMMARY REPORT")
    logger.info(f"{'='*60}")

    successful_scrapes = sum(1 for r in all_results if r["success"])
    total_units = sum(r["units_found"] for r in all_results)

    logger.info(f"Total Properties: {len(TARGET_URLS)}")
    logger.info(f"Successful Scrapes: {successful_scrapes}")
    logger.info(f"Failed Scrapes: {len(TARGET_URLS) - successful_scrapes}")
    logger.info(f"Total Units Found: {total_units}")
    logger.info(f"Supabase Save: {'✅ Success' if supabase_success else '❌ Failed'}")

    # Save detailed results to JSON file
    results_file = f"scraping_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)

    logger.info(f"📄 Detailed results saved to: {results_file}")

    # Show individual results
    logger.info(f"\n{'='*60}")
    logger.info("📋 INDIVIDUAL RESULTS")
    logger.info(f"{'='*60}")

    for result in all_results:
        status = "✅" if result["success"] else "❌"
        logger.info(f"{status} {result['url']} - {result['units_found']} units")

    logger.info(f"\n🎉 Scraping completed!")

if __name__ == "__main__":
    asyncio.run(main())