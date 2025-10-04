#!/usr/bin/env python3
"""
Test Website Accessibility

Quick test to check if the target websites are accessible before scraping.
"""

import urllib.request
import urllib.error
import sys
from typing import Tuple

# Target websites to test
TARGET_URLS = [
    "https://www.thehuntley.com/",
    "https://www.hanoverbuckheadvillage.com/",
    "https://altaporter.com/"
]

def test_website_accessibility(url: str) -> Tuple[str, bool, str]:
    """
    Test if a website is accessible.

    Args:
        url: Website URL to test

    Returns:
        Tuple of (url, is_accessible, status_message)
    """
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                return url, True, f"✅ {response.status} - Accessible"
            else:
                return url, False, f"❌ {response.status} - {response.reason}"
    except urllib.error.HTTPError as e:
        return url, False, f"❌ {e.code} - {e.reason}"
    except urllib.error.URLError as e:
        return url, False, f"❌ Connection Error - {str(e.reason)}"
    except Exception as e:
        return url, False, f"❌ Error - {str(e)}"

def main():
    """Test all target websites for accessibility"""
    print("🌐 Testing website accessibility...")
    print("=" * 60)

    results = [test_website_accessibility(url) for url in TARGET_URLS]

    accessible_count = 0
    for url, is_accessible, status in results:
        print(f"{status}")
        print(f"   {url}")
        print()
        if is_accessible:
            accessible_count += 1

    print("=" * 60)
    print(f"📊 Summary: {accessible_count}/{len(TARGET_URLS)} websites are accessible")
    print()

    if accessible_count == 0:
        print("❌ No websites are accessible. Cannot proceed with scraping.")
        sys.exit(1)
    elif accessible_count < len(TARGET_URLS):
        print(f"⚠️  Only {accessible_count} websites are accessible. Scraping will be limited.")
    else:
        print("✅ All websites are accessible. Ready for scraping!")

if __name__ == "__main__":
    main()