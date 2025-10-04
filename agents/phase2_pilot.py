#!/usr/bin/env python3
"""
Phase 2 Pilot: Rental Data Extraction

Tests the Rental Data Agent on the top 10 high-priority properties
discovered in Phase 1. This pilot validates the vision-based extraction
capabilities and establishes baseline performance metrics.
"""

import asyncio
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import logging
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Phase2PilotExecutor:
    """
    Executes Phase 2: Pilot rental data extraction on top 10 properties
    """

    def __init__(self, stealth_mode: bool = False):
        """Initialize the Phase 2 pilot executor"""
        self.rental_agent = None
        self.priority_system = None
        self.discovery_agent = None
        self.results = {}
        self.pilot_properties = []
        self.stealth_mode = stealth_mode

    async def initialize(self):
        """Initialize agents and systems"""
        print("🚀 Initializing Phase 2 Pilot Executor...")

        # Import and initialize agents
        try:
            from rental_data_agent import RentalDataAgent
            from priority_system import PrioritySystem
            from property_discovery_agent import PropertyDiscoveryAgent

            self.rental_agent = RentalDataAgent()
            self.priority_system = PrioritySystem()
            self.discovery_agent = PropertyDiscoveryAgent()

            # Enable stealth mode if requested
            if self.stealth_mode:
                await self.rental_agent.enable_stealth_mode()
                print("🕵️ Stealth mode enabled for rental agent")

            print("✅ Agents initialized successfully")

        except ImportError as e:
            print(f"❌ Failed to import agents: {e}")
            return False

        return True

    async def check_api_keys(self) -> bool:
        """Check if required API keys are configured"""
        print("\n🔑 Checking API Key Configuration...")

        required_keys = {
            'OPENAI_API_KEY': 'OpenAI API for vision-based rental extraction',
            'SUPABASE_URL': 'Supabase project URL',
            'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key'
        }

        missing_keys = []
        for key, description in required_keys.items():
            if not os.getenv(key):
                missing_keys.append(f"{key} ({description})")

        if missing_keys:
            print("⚠️  Missing API Keys:")
            for key in missing_keys:
                print(f"   - {key}")
            print("\n💡 To run with real data, configure these in your .env file")
            print("   Copy agents/.env.example to agents/.env and fill in your keys")
            return False

        print("✅ All API keys configured")
        return True

    async def get_top_priority_properties(self, limit: int = 10) -> List[Dict]:
        """
        Get the top priority properties from Phase 1 discovery

        Args:
            limit: Maximum number of properties to retrieve

        Returns:
            List of top priority properties
        """
        print(f"\n🎯 Retrieving top {limit} priority properties...")

        try:
            # Get top priority properties from the database
            top_properties = await self.priority_system.get_next_priority_properties(limit=limit)

            if not top_properties:
                print("⚠️  No properties found in database. Running demo mode...")
                return await self.get_demo_properties(limit)

            print(f"✅ Retrieved {len(top_properties)} high-priority properties")

            # Display top properties
            for i, prop in enumerate(top_properties[:5], 1):  # Show first 5
                print(f"   {i}. {prop.get('property_name', 'Unknown')} - Priority: {prop.get('priority_level', 'unknown')}")

            if len(top_properties) > 5:
                print(f"   ... and {len(top_properties) - 5} more")

            return top_properties

        except Exception as e:
            logger.error(f"Error retrieving priority properties: {str(e)}")
            print(f"❌ Error retrieving properties: {str(e)}")
            print("⚠️  Falling back to demo mode...")
            return await self.get_demo_properties(limit)

    async def get_demo_properties(self, limit: int) -> List[Dict]:
        """Get demo properties for testing with real apartment URLs"""
        print(f"🎭 Generating {limit} demo properties with real apartment URLs for testing...")

        # Real apartment property URLs provided by user for testing
        real_apartment_urls = [
            "https://www.bellmorningside.com/",
            "https://www.thecollectiveuws.com/",
            "https://www.thecollectiveuws.com/",
            "https://www.novelwestmidtown.com/",
            "https://altaporter.com/"
        ]

        demo_properties = []
        for i in range(min(limit, len(real_apartment_urls))):
            # Use real URLs but keep demo names for clarity
            demo_properties.append({
                'property_id': f'real_test_{i+1}',
                'property_name': f'Real Test Apartments {i+1}',
                'property_url': real_apartment_urls[i],
                'priority_score': 0.9 - (i * 0.05),
                'priority_level': 'high' if i < 3 else 'medium',
                'website_complexity': 'medium',
                'total_units': 200 + (i * 50),
                'property_type': 'luxury' if i % 2 == 0 else 'premium'
            })

        return demo_properties

    async def run_rental_extraction_pilot(self, properties: List[Dict]) -> Dict:
        """
        Run rental data extraction pilot on the given properties

        Args:
            properties: List of properties to extract rental data from

        Returns:
            Pilot execution results
        """
        print(f"\n🏠 Starting Rental Data Extraction Pilot")
        print(f"🎯 Target: {len(properties)} properties")
        print("=" * 60)

        start_time = datetime.now()
        results = {
            'pilot_start_time': start_time.isoformat(),
            'total_properties': len(properties),
            'successful_extractions': 0,
            'failed_extractions': 0,
            'extraction_results': [],
            'performance_metrics': {},
            'errors': []
        }

        # Check if we have API keys
        has_api_keys = await self.check_api_keys()

        if not has_api_keys:
            # Run in demo mode
            return await self.run_demo_pilot(properties)

        try:
            # Process each property
            async with self.rental_agent:
                for i, property_data in enumerate(properties, 1):
                    print(f"\n🔍 Processing Property {i}/{len(properties)}")
                    print(f"   🏢 {property_data.get('property_name', 'Unknown')}")
                    print(f"   🌐 {property_data.get('property_url', 'N/A')}")

                    try:
                        # Extract rental data - returns List[RentalData]
                        rental_units = await self.rental_agent.extract_rental_data_with_retry(
                            property_url=property_data.get('property_url'),
                            property_id=property_data.get('property_id')
                        )

                        # Check if extraction was successful (non-empty list)
                        if rental_units and len(rental_units) > 0:
                            print("   ✅ Extraction successful")
                            results['successful_extractions'] += 1

                            # Store in database if available
                            await self.store_rental_data(rental_units, property_data)

                        else:
                            print(f"   ❌ Extraction failed: No rental units found")
                            results['failed_extractions'] += 1
                            results['errors'].append({
                                'property': property_data.get('property_name'),
                                'error': 'No rental units extracted'
                            })

                        # Add to results
                        results['extraction_results'].append({
                            'property_id': property_data.get('property_id'),
                            'property_name': property_data.get('property_name'),
                            'success': len(rental_units) > 0,
                            'units_found': len(rental_units),
                            'processing_time': 0,  # Could be calculated if needed
                            'error': None if len(rental_units) > 0 else 'No rental units extracted'
                        })

                    except Exception as e:
                        logger.error(f"Error processing property {property_data.get('property_name')}: {str(e)}")
                        print(f"   ❌ Processing error: {str(e)}")
                        results['failed_extractions'] += 1
                        results['errors'].append({
                            'property': property_data.get('property_name'),
                            'error': str(e)
                        })
                        results['extraction_results'].append({
                            'property_id': property_data.get('property_id'),
                            'property_name': property_data.get('property_name'),
                            'success': False,
                            'units_found': 0,
                            'processing_time': 0,
                            'error': str(e)
                        })

                    # Small delay between properties to be respectful
                    await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"Error in pilot execution: {str(e)}")
            results['errors'].append({
                'phase': 'pilot_execution',
                'error': str(e)
            })

        # Calculate performance metrics
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()

        results.update({
            'pilot_end_time': end_time.isoformat(),
            'total_duration_seconds': total_duration,
            'success_rate': results['successful_extractions'] / len(properties) if properties else 0,
            'average_processing_time': sum(r.get('processing_time', 0) for r in results['extraction_results']) / len(results['extraction_results']) if results['extraction_results'] else 0,
            'total_units_extracted': sum(r.get('units_found', 0) for r in results['extraction_results'])
        })

        self.results = results
        return results

    async def run_demo_pilot(self, properties: List[Dict]) -> Dict:
        """Run pilot in demo mode without API keys"""
        print("\n🎭 Running Pilot in DEMO MODE (No API keys configured)")
        print("   This will simulate rental data extraction")

        start_time = datetime.now()
        results = {
            'pilot_start_time': start_time.isoformat(),
            'total_properties': len(properties),
            'successful_extractions': 0,
            'failed_extractions': 0,
            'extraction_results': [],
            'demo_mode': True
        }

        # Simulate processing each property
        for i, property_data in enumerate(properties, 1):
            print(f"\n🔍 Processing Property {i}/{len(properties)}")
            print(f"   🏢 {property_data.get('property_name', 'Unknown')}")

            # Simulate success/failure randomly (80% success rate)
            success = i <= int(len(properties) * 0.8)
            processing_time = 2.0 + (i * 0.5)  # Simulate varying processing times

            if success:
                units_found = 5 + (i * 2)  # Simulate finding rental units
                print(f"   ✅ Demo extraction successful - Found {units_found} units")
                results['successful_extractions'] += 1
            else:
                print("   ❌ Demo extraction failed - Simulated error")
                results['failed_extractions'] += 1

            results['extraction_results'].append({
                'property_id': property_data.get('property_id'),
                'property_name': property_data.get('property_name'),
                'success': success,
                'units_found': units_found if success else 0,
                'processing_time': processing_time,
                'demo_data': True
            })

            # Simulate processing delay
            await asyncio.sleep(0.5)

        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()

        results.update({
            'pilot_end_time': end_time.isoformat(),
            'total_duration_seconds': total_duration,
            'success_rate': results['successful_extractions'] / len(properties),
            'average_processing_time': sum(r['processing_time'] for r in results['extraction_results']) / len(results['extraction_results']),
            'total_units_extracted': sum(r['units_found'] for r in results['extraction_results'])
        })

        print("\n📊 Demo Pilot Results:")
        print(f"   ✅ Successful: {results['successful_extractions']}")
        print(f"   ❌ Failed: {results['failed_extractions']}")
        print(f"   📊 Success Rate: {results['success_rate']:.1%}")
        print(f"   ⏱️  Avg Processing Time: {results['average_processing_time']:.1f}s")
        print(f"   🏠 Total Units: {results['total_units_extracted']}")

        self.results = results
        return results

    async def store_rental_data(self, rental_units: List, property_data: Dict):
        """Store extracted rental data in database using the rental agent's method"""
        try:
            if not rental_units:
                logger.info("No rental units to store")
                return

            # Get property_id from property_data
            property_id = property_data.get('property_id')
            if not property_id:
                logger.warning("No property_id available for database storage")
                return

            # Use the rental agent's store_rental_data method
            if self.rental_agent and self.rental_agent.supabase:
                stored_count = await self.rental_agent.store_rental_data(property_id, rental_units)
                logger.info(f"Successfully stored {stored_count}/{len(rental_units)} rental records in database")
            else:
                logger.warning("Rental agent or Supabase client not available - cannot store to database")

        except Exception as e:
            logger.error(f"Error storing rental data: {str(e)}")

    def print_pilot_summary(self):
        """Print comprehensive pilot execution summary"""
        if not self.results:
            print("❌ No pilot results to display")
            return

        print("\n" + "=" * 80)
        print("📋 PHASE 2 PILOT EXECUTION SUMMARY")
        print("=" * 80)

        if self.results.get('errors') and not self.results.get('demo_mode'):
            print(f"❌ Pilot had errors: {len(self.results['errors'])} issues found")

        print(f"🏠 Properties Processed: {self.results.get('total_properties', 0)}")
        print(f"✅ Successful Extractions: {self.results.get('successful_extractions', 0)}")
        print(f"❌ Failed Extractions: {self.results.get('failed_extractions', 0)}")
        print(f"📊 Success Rate: {self.results.get('success_rate', 0):.1%}")
        print(f"⏱️  Avg Processing Time: {self.results.get('average_processing_time', 0):.1f}s")
        print(f"🏠 Total Units Extracted: {self.results.get('total_units_extracted', 0)}")

        if self.results.get('demo_mode'):
            print("🔑 API Keys: ⚠️  Demo Mode")
        else:
            print("🔑 API Keys: ✅ Configured")

        print(f"📅 Completed: {self.results.get('pilot_end_time', 'Unknown')}")

        # Show top performers
        successful_results = [r for r in self.results.get('extraction_results', []) if r.get('success')]
        if successful_results:
            print("\n🏆 Top Performing Properties:")
            top_performers = sorted(successful_results, key=lambda x: x.get('units_found', 0), reverse=True)[:3]
            for i, result in enumerate(top_performers, 1):
                print(f"   {i}. {result.get('property_name', 'Unknown')} - {result.get('units_found', 0)} units")

        # Show errors if any
        if self.results.get('errors'):
            print("\n⚠️  Errors Encountered:")
            for error in self.results['errors'][:3]:  # Show first 3 errors
                print(f"   • {error.get('property', 'Unknown')}: {error.get('error', 'Unknown error')}")

        print("\n💡 Phase 2 Assessment:")
        success_rate = self.results.get('success_rate', 0)
        if success_rate >= 0.8:
            print("   🎉 Excellent performance! Ready to scale to more properties.")
        elif success_rate >= 0.6:
            print("   👍 Good performance. Consider optimizations for failed properties.")
        else:
            print("   ⚠️  Needs improvement. Review extraction logic and error handling.")

        print("\n📈 Next Steps:")
        if self.results.get('demo_mode'):
            print("   1. Configure OpenAI API key in agents/.env")
            print("   2. Run: python phase2_pilot.py")
        else:
            print("   1. Review extraction results in database")
            print("   2. Analyze failed extractions for patterns")
            print("   3. Proceed to Phase 3: Hybrid agent approach")

        print("=" * 80)

async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description='Phase 2 Rental Data Extraction Pilot')
    parser.add_argument('--stealth', action='store_true',
                       help='Enable stealth mode with human-like timing and behavior')
    parser.add_argument('--limit', type=int, default=3,
                       help='Number of properties to test (default: 3)')
    parser.add_argument('--url', type=str,
                       help='Test a specific URL instead of using database properties')

    args = parser.parse_args()

    mode_description = "with stealth mode" if args.stealth else "with standard timing"
    print(f"🏠 Apartment Scraper - Phase 2: Rental Data Extraction Pilot ({mode_description})")
    print("Testing vision-based rental extraction on top 10 high-priority properties")
    print("=" * 60)

    # Initialize pilot executor
    executor = Phase2PilotExecutor(stealth_mode=args.stealth)
    success = await executor.initialize()

    if not success:
        print("❌ Failed to initialize pilot executor")
        return 1

    # Get properties to test
    if args.url:
        # Test specific URL
        print(f"🎯 Testing specific URL: {args.url}")
        test_properties = [{
            'property_id': f'test_url_{hash(args.url) % 10000}',
            'property_name': f'Test URL: {args.url.split("//")[-1].split("/")[0]}',
            'property_url': args.url,
            'priority_score': 1.0,
            'priority_level': 'test'
        }]
        top_properties = test_properties
    else:
        # Get top priority properties from database
        top_properties = await executor.get_top_priority_properties(limit=args.limit)

    if not top_properties:
        print("❌ No properties available for pilot testing")
        return 1

    # Run the pilot
    results = await executor.run_rental_extraction_pilot(top_properties)

    # Print comprehensive summary
    executor.print_pilot_summary()

    return 0 if results.get('success_rate', 0) > 0 else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)