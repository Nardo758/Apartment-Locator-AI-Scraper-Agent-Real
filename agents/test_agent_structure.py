#!/usr/bin/env python3
"""
Test script for Property Discovery Agent
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
        from dataclasses import dataclass
        from datetime import datetime
        print("✅ Standard library imports successful")
    except ImportError as e:
        print(f"❌ Standard library import failed: {e}")
        return False

    # Test optional imports (may not be installed yet)
    optional_imports = [
        ('aiohttp', 'HTTP client for async requests'),
        ('supabase', 'Supabase client'),
        ('anthropic', 'Claude API client'),
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
        from property_discovery_agent import PropertyBasicInfo, PropertyDiscoveryAgent
        print("✅ Agent classes imported successfully")

        # Test dataclass creation
        test_property = PropertyBasicInfo(
            property_name="Test Apartments",
            property_url="https://test-apartments.com",
            year_built=2020,
            total_units=150,
            confidence_score=0.9
        )
        print(f"✅ PropertyBasicInfo dataclass works: {test_property.property_name}")

        # Test agent initialization (without API keys)
        agent = PropertyDiscoveryAgent()
        print("✅ PropertyDiscoveryAgent can be initialized")

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

        required_sections = [
            'API KEYS',
            'SUPABASE CONFIGURATION',
            'AGENT CONFIGURATION',
            'COST CONTROL'
        ]

        for section in required_sections:
            if section in content:
                print(f"✅ Configuration section found: {section}")
            else:
                print(f"❌ Configuration section missing: {section}")
                return False

        return True
    else:
        print("❌ Configuration file not found")
        return False

def main():
    """Run all tests"""
    print("🧪 Property Discovery Agent - Structure Test")
    print("=" * 50)

    tests = [
        ("Basic Imports", test_imports),
        ("Agent Structure", test_agent_structure),
        ("Configuration", test_configuration),
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
        print("🎉 All tests passed! Agent structure is ready.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r agents/requirements.txt")
        print("2. Configure API keys in agents/.env")
        print("3. Run the agent: python agents/property_discovery_agent.py")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())