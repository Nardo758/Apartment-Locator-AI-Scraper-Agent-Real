#!/usr/bin/env python3
"""
Test script for Rental Data Agent
Verifies basic structure and imports work correctly
"""

import sys
import os
from pathlib import Path

# Add the agents directory to Python path
agents_dir = Path(__file__).parent
sys.path.insert(0, str(agents_dir))

def test_imports():
    """Test that basic imports work"""
    print("Testing basic imports...")

    try:
        # Test standard library imports
        import json
        import asyncio
        import base64
        from dataclasses import dataclass
        from datetime import datetime
        print("✅ Standard library imports successful")
    except ImportError as e:
        print(f"❌ Standard library import failed: {e}")
        return False

    # Test optional imports (may not be installed yet)
    optional_imports = [
        ('playwright', 'Browser automation'),
        ('openai', 'Vision model API'),
        ('supabase', 'Database client'),
        ('pydantic', 'Data validation'),
        ('dotenv', 'Environment variables'),
    ]

    for module, description in optional_imports:
        try:
            __import__(module)
            print(f"✅ {module} - {description}")
        except ImportError:
            print(f"⚠️  {module} - {description} (not installed)")

    return True

def test_agent_structure():
    """Test that the agent class can be imported and basic structure works"""
    print("\nTesting agent structure...")

    try:
        # Try to import the agent (this will fail if dependencies missing, but structure should be OK)
        from rental_data_agent import RentalData, RentalDataAgent
        print("✅ Agent classes imported successfully")

        # Test dataclass creation
        test_rental = RentalData(
            floorplan_name="1BR/1BA",
            bedrooms=1,
            bathrooms=1.0,
            monthly_rent=1500.0,
            confidence_score=0.9
        )
        print(f"✅ RentalData dataclass works: {test_rental.floorplan_name} - ${test_rental.monthly_rent}")

        # Test agent initialization (without API keys)
        agent = RentalDataAgent()
        print("✅ RentalDataAgent can be initialized")

        return True

    except Exception as e:
        print(f"❌ Agent structure test failed: {e}")
        return False

def test_configuration():
    """Test configuration file structure"""
    print("\nTesting configuration...")

    config_file = agents_dir / '.env.example'
    if config_file.exists():
        print("✅ Configuration file exists")

        # Check for required configuration sections
        with open(config_file, 'r') as f:
            content = f.read()

        required_keys = [
            'OPENAI_API_KEY',
            'SUPABASE_URL',
            'SUPABASE_SERVICE_ROLE_KEY'
        ]

        for key in required_keys:
            if key in content:
                print(f"✅ Configuration key found: {key}")
            else:
                print(f"❌ Configuration key missing: {key}")
                return False

        return True
    else:
        print("❌ Configuration file not found")
        return False

def test_agent_methods():
    """Test that key agent methods exist"""
    print("\nTesting agent methods...")

    try:
        from rental_data_agent import RentalDataAgent

        agent = RentalDataAgent()

        # Check that key methods exist
        required_methods = [
            'extract_rental_data',
            'run_extraction_pipeline',
            'store_rental_data',
            '_vision_analyze_image',
            '_navigate_to_floor_plans'
        ]

        for method in required_methods:
            if hasattr(agent, method):
                print(f"✅ Method exists: {method}")
            else:
                print(f"❌ Method missing: {method}")
                return False

        return True

    except Exception as e:
        print(f"❌ Method test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Rental Data Agent - Structure Test")
    print("=" * 50)

    tests = [
        ("Basic Imports", test_imports),
        ("Agent Structure", test_agent_structure),
        ("Configuration", test_configuration),
        ("Agent Methods", test_agent_methods),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Running: {test_name}")
        result = test_func()
        results.append((test_name, result))

    print("\n" + "=" * 50)
    print("📊 Test Results:")

    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if not result:
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed! Rental Data Agent structure is ready.")
        print("\nNext steps:")
        print("1. Configure API keys in agents/.env")
        print("2. Test with a real apartment website URL")
        print("3. Integrate with Property Discovery Agent")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())