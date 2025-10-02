#!/usr/bin/env python3
"""
Integration test showing how Property Discovery Agent and Rental Data Agent work together
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

async def demo_agent_integration():
    """
    Demonstrate how the two agents work together in the hybrid system
    """
    print("🔗 Agent System Integration Demo")
    print("=" * 50)

    # Import agents
    from property_discovery_agent import PropertyDiscoveryAgent, PropertyBasicInfo
    from rental_data_agent import RentalDataAgent, RentalData

    print("✅ Agents imported successfully")

    # Create sample property data (simulating discovery agent output)
    sample_property = PropertyBasicInfo(
        property_name="Riverside Apartments",
        property_url="https://example-riverside-apartments.com",
        year_built=2018,
        total_units=120,
        property_type="mid-rise",
        management_company="Riverside Property Management",
        address="123 River Street",
        city="Atlanta",
        state="GA",
        zip_code="30301",
        confidence_score=0.95,
        website_complexity="medium"
    )

    print(f"📊 Sample Property: {sample_property.property_name}")
    print(f"🏢 Units: {sample_property.total_units}, Built: {sample_property.year_built}")
    print(f"🌐 Complexity: {sample_property.website_complexity}")

    # Simulate smart routing decision
    print("\n🧠 Smart Routing Decision:")

    if sample_property.website_complexity == "simple":
        print("   → Route to CLAUDE AGENT (cost-effective for simple sites)")
        print("   → Expected cost: ~$0.01-0.05 per property")
        print("   → Processing: Lightweight HTML extraction")
    elif sample_property.website_complexity in ["medium", "complex"]:
        print("   → Route to VISION AGENT (handles complex multi-page flows)")
        print("   → Expected cost: ~$0.10-0.50 per property")
        print("   → Processing: Browser automation + AI vision analysis")
    else:
        print("   → Route to CLAUDE AGENT (default fallback)")

    # Simulate rental data extraction results
    print("\n💰 Simulated Rental Data Extraction:")

    sample_rentals = [
        RentalData(
            floorplan_name="1BR/1BA Standard",
            bedrooms=1,
            bathrooms=1.0,
            sqft=650,
            monthly_rent=1450.00,
            lease_term_months=12,
            concessions="$200 off first month",
            availability_date="2025-10-15",
            availability_status="available",
            confidence_score=0.92,
            data_source="vision_agent"
        ),
        RentalData(
            floorplan_name="2BR/2BA Deluxe",
            bedrooms=2,
            bathrooms=2.0,
            sqft=950,
            monthly_rent=1850.00,
            lease_term_months=12,
            concessions="One month free",
            availability_date="2025-11-01",
            availability_status="available",
            confidence_score=0.89,
            data_source="vision_agent"
        )
    ]

    for rental in sample_rentals:
        print(f"   🏠 {rental.floorplan_name}: ${rental.monthly_rent}/mo")
        print(f"      📐 {rental.sqft} sqft, Available: {rental.availability_date}")
        print(f"      🎁 {rental.concessions}")
        print()

    # Show cost comparison
    print("💸 Cost Analysis:")
    print("   📈 Vision Agent: Higher cost, higher accuracy, handles complexity")
    print("   📉 Claude Agent: Lower cost, good for simple sites")
    print("   🎯 Hybrid: Smart routing = optimal cost-efficiency")

    print("\n✅ Integration demo complete!")
    print("Next: Configure API keys and test with real apartment websites")

if __name__ == "__main__":
    asyncio.run(demo_agent_integration())