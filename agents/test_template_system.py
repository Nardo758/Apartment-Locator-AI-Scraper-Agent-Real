#!/usr/bin/env python3
"""
Test script for the template-based scraping system.
Tests template detection, learning, and memory functionality.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the agents directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from template_manager import TemplateManager
from smart_scraper import SmartScraper
from website_templates import WEBSITE_TEMPLATES, ONE_OFF_TEMPLATES


async def test_template_detection():
    """Test template detection functionality."""
    print("🧪 Testing Template Detection...")

    manager = TemplateManager()

    test_cases = [
        ("https://www.altaporter.com", "one_off"),
        ("https://www.realpage.com/some-property", "realpage"),
        ("https://www.yardi.com/property", "yardi"),
        ("https://www.entrata.com/listing", "entrata"),
        ("https://unknown-site.com", "unknown"),
    ]

    for url, expected_type in test_cases:
        template, detected_type = manager.detect_template(url, "")
        print(f"  {url} -> {detected_type} (expected: {expected_type})")
        assert detected_type == expected_type, f"Expected {expected_type}, got {detected_type}"

    print("✅ Template detection tests passed!")


def test_template_learning():
    """Test template learning and storage."""
    print("🧪 Testing Template Learning...")

    # Use a temporary storage file for testing
    test_storage = Path("test_templates.json")
    if test_storage.exists():
        test_storage.unlink()

    try:
        manager = TemplateManager(str(test_storage))

        # Test learning a new template
        test_url = "https://www.test-property.com"
        successful_selectors = {
            "cookie_selector": "button[class*='close']",
            "floorplan_selector": "a[href*='floorplans']",
            "price_selector": ".rent-price"
        }

        manager.learn_new_template(test_url, successful_selectors)

        # Verify it was learned
        template, template_type = manager.detect_template(test_url, "")
        assert template_type == "learned", f"Expected learned template, got {template_type}"
        assert template["selectors"]["cookie_selector"] == "button[class*='close']"

        # Test template stats
        stats = manager.get_template_stats()
        assert stats["total_learned_templates"] >= 1

        print("✅ Template learning tests passed!")

    finally:
        if test_storage.exists():
            test_storage.unlink()


async def test_smart_scraper_initialization():
    """Test SmartScraper initialization and basic functionality."""
    print("🧪 Testing Smart Scraper Initialization...")

    manager = TemplateManager()
    scraper = SmartScraper(manager)

    # Test that scraper has required attributes
    assert hasattr(scraper, 'template_manager')
    assert hasattr(scraper, 'successful_paths')

    # Test scraping stats
    stats = scraper.get_scraping_stats()
    assert isinstance(stats, dict)
    assert "learned_templates" in stats

    print("✅ Smart Scraper initialization tests passed!")


def test_website_templates():
    """Test that website templates are properly structured."""
    print("🧪 Testing Website Templates Structure...")

    required_keys = ["identifiers", "navigation", "behavior"]

    for template_name, template in WEBSITE_TEMPLATES.items():
        for key in required_keys:
            assert key in template, f"Template {template_name} missing {key}"

        # Check identifiers
        assert "domain_patterns" in template["identifiers"]
        assert "content_indicators" in template["identifiers"]

        # Check navigation
        assert "cookie_selectors" in template["navigation"]

        print(f"  ✅ {template_name} template structure OK")

    print("✅ Website templates structure tests passed!")


async def run_all_tests():
    """Run all template system tests."""
    print("🚀 Running Template-Based Scraping System Tests\n")

    try:
        test_website_templates()
        await test_template_detection()
        test_template_learning()
        await test_smart_scraper_initialization()

        print("\n🎉 All tests passed! Template system is working correctly.")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)