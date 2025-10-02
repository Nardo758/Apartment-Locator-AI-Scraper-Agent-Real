#!/usr/bin/env python3
"""
Test script for Phase 2: Rental Data Extraction Pilot

Validates that the pilot executor works correctly and integrates
properly with the rental data agent and priority system.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

async def test_pilot_initialization():
    """Test pilot executor initialization"""
    print("🧪 Testing Phase 2 Pilot Initialization...")

    try:
        from phase2_pilot import Phase2PilotExecutor

        executor = Phase2PilotExecutor()
        success = await executor.initialize()

        if not success:
            print("❌ Pilot initialization failed")
            return False

        print("✅ Pilot executor initialized successfully")
        return True

    except Exception as e:
        print(f"❌ Initialization test failed: {str(e)}")
        return False

async def test_property_retrieval():
    """Test retrieving top priority properties"""
    print("\n🎯 Testing Property Retrieval...")

    try:
        from phase2_pilot import Phase2PilotExecutor

        executor = Phase2PilotExecutor()
        await executor.initialize()

        # Test demo property generation
        demo_properties = await executor.get_demo_properties(5)

        if len(demo_properties) != 5:
            print(f"❌ Expected 5 demo properties, got {len(demo_properties)}")
            return False

        # Check property structure
        required_fields = ['property_id', 'property_name', 'property_url', 'priority_score', 'priority_level']
        for prop in demo_properties:
            for field in required_fields:
                if field not in prop:
                    print(f"❌ Missing field '{field}' in demo property")
                    return False

        print("✅ Property retrieval working correctly")
        print(f"   📊 Generated {len(demo_properties)} demo properties")
        return True

    except Exception as e:
        print(f"❌ Property retrieval test failed: {str(e)}")
        return False

async def test_demo_pilot_execution():
    """Test demo pilot execution"""
    print("\n🎭 Testing Demo Pilot Execution...")

    try:
        from phase2_pilot import Phase2PilotExecutor

        executor = Phase2PilotExecutor()
        await executor.initialize()

        # Get demo properties
        demo_properties = await executor.get_demo_properties(3)

        # Run demo pilot
        results = await executor.run_demo_pilot(demo_properties)

        # Validate results structure
        required_fields = [
            'total_properties', 'successful_extractions', 'failed_extractions',
            'success_rate', 'average_processing_time', 'total_units_extracted',
            'extraction_results', 'demo_mode'
        ]

        for field in required_fields:
            if field not in results:
                print(f"❌ Missing field '{field}' in pilot results")
                return False

        if results['total_properties'] != 3:
            print(f"❌ Expected 3 properties processed, got {results['total_properties']}")
            return False

        if not results.get('demo_mode'):
            print("❌ Demo mode flag not set")
            return False

        if len(results['extraction_results']) != 3:
            print(f"❌ Expected 3 extraction results, got {len(results['extraction_results'])}")
            return False

        print("✅ Demo pilot execution working correctly")
        print(f"   📊 Success Rate: {results['success_rate']:.1%}")
        print(f"   🏠 Total Units: {results['total_units_extracted']}")
        return True

    except Exception as e:
        print(f"❌ Demo pilot test failed: {str(e)}")
        return False

async def test_api_key_validation():
    """Test API key validation"""
    print("\n🔑 Testing API Key Validation...")

    try:
        from phase2_pilot import Phase2PilotExecutor

        executor = Phase2PilotExecutor()
        await executor.initialize()

        # Test with no API keys (should return False)
        has_keys = await executor.check_api_keys()

        if has_keys:
            print("❌ API key check should fail when no keys are configured")
            return False

        print("✅ API key validation working correctly")
        return True

    except Exception as e:
        print(f"❌ API key validation test failed: {str(e)}")
        return False

async def test_agent_integration():
    """Test integration with rental data agent"""
    print("\n🔗 Testing Agent Integration...")

    try:
        from rental_data_agent import RentalDataAgent

        # Test agent instantiation
        agent = RentalDataAgent()

        # Check if required methods exist
        required_methods = ['extract_rental_data']
        for method in required_methods:
            if not hasattr(agent, method):
                print(f"❌ Rental agent missing method: {method}")
                return False

        print("✅ Agent integration working correctly")
        return True

    except Exception as e:
        print(f"❌ Agent integration test failed: {str(e)}")
        return False

async def main():
    """Run all Phase 2 tests"""
    print("🧪 Phase 2 Pilot - Test Suite")
    print("=" * 50)

    tests = [
        ("Pilot Initialization", test_pilot_initialization),
        ("Property Retrieval", test_property_retrieval),
        ("Demo Pilot Execution", test_demo_pilot_execution),
        ("API Key Validation", test_api_key_validation),
        ("Agent Integration", test_agent_integration)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n🔬 Running: {test_name}")
        try:
            result = await test_func()
            if result:
                print(f"✅ {test_name}: PASSED")
                passed += 1
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {str(e)}")

    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All Phase 2 tests passed! Pilot is ready for production.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review and fix issues before production use.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)