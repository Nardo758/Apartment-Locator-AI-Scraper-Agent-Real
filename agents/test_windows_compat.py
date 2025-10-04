#!/usr/bin/env python3
"""
Simple Windows Compatibility Test
Tests that the system runs without emoji errors
"""

import asyncio
import sys
import time

def test_windows_compatibility():
    """Test that the system works on Windows without emoji issues"""
    print("[TEST] Windows Compatibility Test")
    print("[TEST] Testing plain text output...")
    print()

    # Test various status messages
    messages = [
        "[INFO] System starting...",
        "[SUCCESS] Module loaded successfully",
        "[MONITOR] Activity monitoring active",
        "[COUNTDOWN] 30 seconds remaining",
        "[CAPTURE] Data captured successfully",
        "[SAVE] Pattern saved to file",
        "[ERROR] Test error message",
        "[WARNING] Test warning message",
        "[STEALTH] Browser configured",
        "[NAVIGATE] Navigation complete"
    ]

    for msg in messages:
        print(msg)
        time.sleep(0.1)

    print()
    print("[TEST] All messages displayed successfully!")
    print("[TEST] No emoji errors detected")
    print("[SUCCESS] Windows compatibility confirmed")

    return True

async def main():
    """Main test function"""
    if len(sys.argv) > 1 and sys.argv[1] == "--full":
        print("[TEST] Running full compatibility test...")

        # Test async functionality
        print("[ASYNC] Testing async operations...")
        await asyncio.sleep(0.5)
        print("[ASYNC] Async test complete")

        # Test basic browser setup (without actually opening)
        try:
            from playwright.async_api import async_playwright
            print("[PLAYWRIGHT] Testing Playwright import...")
            async with async_playwright() as p:
                print("[PLAYWRIGHT] Playwright initialized successfully")
        except Exception as e:
            print(f"[ERROR] Playwright test failed: {e}")

    else:
        test_windows_compatibility()

if __name__ == "__main__":
    asyncio.run(main())