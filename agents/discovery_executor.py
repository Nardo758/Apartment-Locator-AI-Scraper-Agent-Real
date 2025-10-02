#!/usr/bin/env python3
"""
Property Discovery Execution Script - Phase 1

Runs the Property Discovery Agent to build initial database of 100-200 properties.
This script demonstrates the full discovery pipeline.
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, List
from datetime import datetime
import logging

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PropertyDiscoveryExecutor:
    """
    Executes the property discovery pipeline for Phase 1
    """

    def __init__(self):
        """Initialize the discovery executor"""
        self.discovery_agent = None
        self.priority_system = None
        self.results = {}

    async def initialize(self):
        """Initialize agents and systems"""
        print("🚀 Initializing Property Discovery Executor...")

        # Import and initialize agents
        try:
            from property_discovery_agent import PropertyDiscoveryAgent
            from priority_system import PrioritySystem

            self.discovery_agent = PropertyDiscoveryAgent()
            self.priority_system = PrioritySystem()

            print("✅ Agents initialized successfully")

        except ImportError as e:
            print(f"❌ Failed to import agents: {e}")
            return False

        return True

    async def check_api_keys(self) -> bool:
        """Check if required API keys are configured"""
        print("\n🔑 Checking API Key Configuration...")

        required_keys = {
            'SERP_API_KEY': 'SERP API for property URL discovery',
            'ANTHROPIC_API_KEY': 'Claude API for information extraction',
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

    async def run_discovery_pipeline(self, location: str = "Atlanta, GA", max_properties: int = 50) -> Dict:
        """
        Run the complete property discovery pipeline

        Args:
            location: Target location for property discovery
            max_properties: Maximum properties to discover

        Returns:
            Discovery results summary
        """
        print(f"\n🏙️  Starting Property Discovery for {location}")
        print(f"🎯 Target: {max_properties} properties")
        print("=" * 60)

        start_time = datetime.now()

        # Check if we have API keys
        has_api_keys = await self.check_api_keys()

        if not has_api_keys:
            # Run in demo mode
            return await self.run_demo_mode(location, max_properties)

        try:
            # Run actual discovery
            print("\n🔍 Running Property Discovery Agent...")

            # Use the discovery agent
            async with self.discovery_agent:
                summary = await self.discovery_agent.run_discovery_pipeline(
                    location=location,
                    max_properties=max_properties
                )

            print("\n📊 Discovery Results:")
            print(f"   🏢 Properties Found: {summary.get('properties_discovered', 0)}")
            print(f"   💾 Properties Stored: {summary.get('properties_stored', 0)}")
            print(f"   ⏱️  Duration: {total_duration:.1f}s")
            print(f"   📅 Completed: {summary.get('timestamp', 'Unknown')}")

            # Update priorities for discovered properties
            if summary.get('properties_stored', 0) > 0:
                print("\n🎯 Updating Property Priorities...")
                priority_update = await self.priority_system.update_property_priorities()
                print(f"   ✅ Updated priorities for {priority_update.get('updated', 0)} properties")

            # Get final statistics
            final_stats = await self.get_discovery_statistics()

            end_time = datetime.now()
            total_duration = (end_time - start_time).total_seconds()

            results = {
                'phase': 'property_discovery',
                'location': location,
                'target_properties': max_properties,
                'properties_discovered': summary.get('properties_discovered', 0),
                'properties_stored': summary.get('properties_stored', 0),
                'duration_seconds': total_duration,
                'api_keys_available': True,
                'priority_updates': priority_update,
                'final_statistics': final_stats,
                'timestamp': end_time.isoformat()
            }

            self.results = results
            return results

        except Exception as e:
            logger.error(f"Error in discovery pipeline: {str(e)}")
            return {
                'error': str(e),
                'phase': 'property_discovery',
                'location': location,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in discovery pipeline: {str(e)}")
            return {
                'error': str(e),
                'phase': 'property_discovery',
                'location': location,
                'timestamp': datetime.now().isoformat()
            }

    async def run_demo_mode(self, location: str, max_properties: int) -> Dict:
        """Run in demo mode without API keys"""
        print("\n🎭 Running in DEMO MODE (No API keys configured)")
        print("   This will simulate the discovery process")

        # Simulate discovery results
        simulated_properties = min(max_properties, 25)  # Simulate finding some properties

        print(f"\n🎲 Simulating discovery of {simulated_properties} properties...")

        # Create sample property data
        sample_properties = [
            {
                'property_name': f'Sample Luxury Apartments {i+1}',
                'property_url': f'https://sample-luxury-{i+1}.com',
                'year_built': 2020 + (i % 5),
                'total_units': 100 + (i * 20),
                'property_type': 'luxury' if i % 3 == 0 else 'standard',
                'management_company': 'Demo Management Co' if i % 2 == 0 else 'Local Property Mgmt',
                'city': location.split(',')[0],
                'state': location.split(',')[1].strip() if ',' in location else 'GA',
                'confidence_score': 0.8 + (i * 0.01),
                'website_complexity': 'medium'
            }
            for i in range(simulated_properties)
        ]

        # Calculate priorities for sample data
        print("   🎯 Calculating priorities for sample properties...")
        priority_counts = {'high': 0, 'medium': 0, 'low': 0}

        for prop in sample_properties:
            priority_score = self.priority_system.calculate_priority_score(prop)
            priority_counts[priority_score.priority_level] += 1

        # Simulate processing time
        await asyncio.sleep(2)

        results = {
            'phase': 'property_discovery_demo',
            'location': location,
            'target_properties': max_properties,
            'properties_discovered': simulated_properties,
            'properties_stored': simulated_properties,  # In demo mode, all are "stored"
            'duration_seconds': 2.0,
            'api_keys_available': False,
            'demo_mode': True,
            'priority_distribution': priority_counts,
            'sample_properties': sample_properties[:3],  # Show first 3
            'timestamp': datetime.now().isoformat()
        }

        print("\n📊 Demo Results:")
        print(f"   🏢 Properties Found: {simulated_properties}")
        print(f"   🎯 High Priority: {priority_counts['high']}")
        print(f"   📊 Medium Priority: {priority_counts['medium']}")
        print(f"   📉 Low Priority: {priority_counts['low']}")

        self.results = results
        return results

    async def get_discovery_statistics(self) -> Dict:
        """Get statistics about the current property database"""
        if not self.priority_system or not self.priority_system.supabase:
            return {'error': 'Database not available'}

        try:
            # This would query the actual database in production
            return {
                'total_properties': 0,  # Would be actual count
                'priority_breakdown': {'high': 0, 'medium': 0, 'low': 0},
                'complexity_breakdown': {'simple': 0, 'medium': 0, 'complex': 0},
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            return {'error': str(e)}

    def print_summary(self):
        """Print execution summary"""
        if not self.results:
            print("❌ No results to display")
            return

        print("\n" + "=" * 80)
        print("📋 PROPERTY DISCOVERY EXECUTION SUMMARY")
        print("=" * 80)

        if self.results.get('error'):
            print(f"❌ Error: {self.results['error']}")
            return

        print(f"🏙️  Location: {self.results.get('location', 'Unknown')}")
        print(f"🎯 Target Properties: {self.results.get('target_properties', 0)}")
        print(f"🏢 Properties Discovered: {self.results.get('properties_discovered', 0)}")
        print(f"💾 Properties Stored: {self.results.get('properties_stored', 0)}")
        print(f"   ⏱️  Duration: {self.results.get('duration_seconds', 0):.1f}s")

        if self.results.get('api_keys_available'):
            print("🔑 API Keys: ✅ Configured")
        else:
            print("🔑 API Keys: ⚠️  Demo Mode")

        if 'priority_distribution' in self.results:
            pd = self.results['priority_distribution']
            print(f"🎯 Priority Distribution: High: {pd.get('high', 0)}, Medium: {pd.get('medium', 0)}, Low: {pd.get('low', 0)}")

        print(f"📅 Completed: {self.results.get('timestamp', 'Unknown')}")

        print("\n💡 Next Steps:")
        if not self.results.get('api_keys_available'):
            print("   1. Configure API keys in agents/.env")
            print("   2. Run: python discovery_executor.py")
        else:
            print("   1. Review discovered properties in database")
            print("   2. Run Phase 2: Pilot rental data extraction")
            print("   3. Implement hybrid agent routing")

        print("=" * 80)

async def main():
    """Main execution function"""
    print("🏢 Apartment Scraper - Property Discovery Phase 1")
    print("Building initial database of apartment properties")
    print("=" * 60)

    # Initialize executor
    executor = PropertyDiscoveryExecutor()
    success = await executor.initialize()

    if not success:
        print("❌ Failed to initialize executor")
        return 1

    # Run discovery pipeline
    location = os.getenv('DISCOVERY_LOCATION', 'Atlanta, GA')
    max_properties = int(os.getenv('DISCOVERY_MAX_PROPERTIES', '50'))

    results = await executor.run_discovery_pipeline(
        location=location,
        max_properties=max_properties
    )

    # Print summary
    executor.print_summary()

    return 0 if 'error' not in results else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)