#!/usr/bin/env python3
"""
Test script for the Watch and Learn system
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the agents directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from learning_system import start_learning_session, extract_with_learning


async def test_learning_system():
    """Test the learning system with different modes"""

    print("🎯 Testing Watch and Learn System")
    print("=" * 50)

    # Test URLs
    test_urls = [
        "https://www.thehuntley.com/",
        "https://www.hanoverbuckheadvillage.com/",
        "https://altaporter.com/"
    ]

    if len(sys.argv) < 2:
        print("Usage: python test_learning.py <mode> [url]")
        print("Modes:")
        print("  learn    - Start learning session")
        print("  extract  - Extract with learning")
        print("  demo     - Run demonstration")
        return

    mode = sys.argv[1]

    if mode == "learn":
        url = sys.argv[2] if len(sys.argv) > 2 else test_urls[0]
        print(f"🎬 Starting learning session for: {url}")
        learned_path = await start_learning_session(url)
        if learned_path:
            print(f"✅ Learned path with {len(learned_path.actions)} actions")

    elif mode == "extract":
        url = sys.argv[2] if len(sys.argv) > 2 else test_urls[0]
        print(f"🤖 Extracting with learning from: {url}")
        results = await extract_with_learning(url, enable_learning=True)
        print(f"📊 Found {len(results)} rental units")

        if results:
            for i, unit in enumerate(results[:3]):  # Show first 3
                print(f"  Unit {i+1}: {unit.get('price', 'N/A')} - {unit.get('bedrooms', 'N/A')} bed")

    elif mode == "demo":
        print("🎭 Running learning system demonstration")
        print("\n1. First, let's try extracting without learning...")
        url = test_urls[2]  # altaporter.com
        results = await extract_with_learning(url, enable_learning=False)
        print(f"   Found {len(results)} units without learning")

        print("\n2. Now let's try with learning enabled...")
        results = await extract_with_learning(url, enable_learning=True)
        print(f"   Found {len(results)} units with learning")

    else:
        print(f"❌ Unknown mode: {mode}")


if __name__ == "__main__":
    asyncio.run(test_learning_system())