#!/usr/bin/env python3
"""
Test script for Property Discovery Phase 1

Validates that the discovery executor and agents work correctly.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

async def test_discovery_executor():
    """Test the discovery executor functionality"""
    print("🧪 Testing Property Discovery Executor...")

    try:
        # Import the executor
        from discovery_executor import PropertyDiscoveryExecutor

        # Initialize executor
        executor = PropertyDiscoveryExecutor()
        success = await executor.initialize()

        if not success:
            print("❌ Executor initialization failed")
            return False

        print("✅ Executor initialized successfully")

        # Test API key checking (should fail in demo mode)
        has_keys = await executor.check_api_keys()
        if has_keys:
            print("✅ API keys configured")
        else:
            print("⚠️  API keys not configured (expected in demo mode)")

        # Test demo mode execution
        print("\n🎭 Testing demo mode execution...")
        results = await executor.run_demo_mode("Atlanta, GA", 10)

        if 'error' in results:
            print(f"❌ Demo mode failed: {results['error']}")
            return False

        if results.get('properties_discovered', 0) != 10:
            print(f"❌ Expected 10 properties, got {results.get('properties_discovered', 0)}")
            return False

        print("✅ Demo mode executed successfully")
        print(f"   📊 Properties: {results.get('properties_discovered', 0)}")
        print(f"   🎯 Priority distribution: {results.get('priority_distribution', {})}")

        # Test summary printing
        print("\n📋 Testing summary output...")
        executor.print_summary()

        return True

    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_agent_imports():
    """Test that all required agents can be imported"""
    print("\n🔧 Testing agent imports...")

    try:
        from property_discovery_agent import PropertyDiscoveryAgent
        print("✅ PropertyDiscoveryAgent imported")

        from priority_system import PrioritySystem
        print("✅ PrioritySystem imported")

        # Test basic instantiation (without API keys)
        discovery_agent = PropertyDiscoveryAgent()
        priority_system = PrioritySystem()

        print("✅ Agents instantiated successfully")
        return True

    except ImportError as e:
        print(f"❌ Import failed: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Instantiation failed: {str(e)}")
        return False

async def test_priority_scoring():
    """Test priority scoring logic"""
    print("\n🎯 Testing priority scoring...")

    try:
        from priority_system import PrioritySystem

        priority_system = PrioritySystem()

        # Test sample properties
        test_properties = [
            {
                'property_name': 'Luxury High-Rise Apartments',
                'total_units': 350,
                'property_type': 'luxury',
                'management_company': 'CBRE',
                'website_complexity': 'medium'
            },
            {
                'property_name': 'Standard Apartments',
                'total_units': 80,
                'property_type': 'standard',
                'management_company': 'Local Management',
                'website_complexity': 'simple'
            }
        ]

        scores = []
        for prop in test_properties:
            score = priority_system.calculate_priority_score(prop)
            scores.append(score)
            print(f"   📊 {prop['property_name']}: {score.priority_level} ({score.total_score:.2f})")

        # Validate scoring makes sense
        if scores[0].total_score <= scores[1].total_score:
            print("❌ Priority scoring logic incorrect - luxury should score higher")
            return False

        print("✅ Priority scoring working correctly")
        return True

    except Exception as e:
        print(f"❌ Priority scoring test failed: {str(e)}")
        return False

async def main():
    """Run all tests"""
    print("🧪 Property Discovery Phase 1 - Test Suite")
    print("=" * 50)

    tests = [
        ("Agent Imports", test_agent_imports),
        ("Discovery Executor", test_discovery_executor),
        ("Priority Scoring", test_priority_scoring)
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
        print("🎉 All tests passed! Phase 1 is ready for production.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review and fix issues before production use.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)