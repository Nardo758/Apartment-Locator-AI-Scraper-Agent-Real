#!/usr/bin/env python3
"""
Quick Activity Monitor Demo
Demonstrates the activity monitoring functionality without full navigation
"""

import asyncio
import time
import sys

class ActivityMonitorDemo:
    """Demo version that shows activity monitoring without browser navigation"""

    def __init__(self):
        self.last_activity = time.time()
        self.monitoring = False

    async def demo_activity_monitoring(self):
        """Demonstrate the activity monitoring countdown"""
        print("[DEMO] Activity Monitor Training Demo")
        print("[DEMO] Simulating user activity and auto-capture")
        print()

        print("Instructions:")
        print("  1. System monitors your 'activity' (simulated)")
        print("  2. When you stop, countdown begins")
        print("  3. After 10 seconds, data is 'captured'")
        print("  4. Press Ctrl+C to stop")
        print("=" * 50)

        print("[MONITOR] Starting activity monitoring...")
        print("[MONITOR] Will capture data 10 seconds after you stop interacting")
        print()

        self.monitoring = True
        self.last_activity = time.time()

        inactive_start = None
        countdown_started = False

        try:
            while True:
                current_time = time.time()
                time_since_activity = current_time - self.last_activity

                # Simulate some activity every few seconds
                if time_since_activity > 3:
                    print("[ACTIVITY] Simulating user activity (mouse/keyboard)...")
                    self.last_activity = current_time
                    inactive_start = None
                    countdown_started = False
                    await asyncio.sleep(2)

                else:
                    # User has been inactive
                    if inactive_start is None:
                        inactive_start = current_time
                        countdown_started = True
                        print("[MONITOR] Activity stopped! Starting 10-second capture countdown...")

                    elapsed_inactive = current_time - inactive_start
                    remaining = 10 - elapsed_inactive

                    if remaining > 0:
                        print(f"[COUNTDOWN] Capturing in {remaining:.1f} seconds... (simulate navigation)", end='\r')
                        await asyncio.sleep(0.5)
                    else:
                        print("\n[CAPTURE] Auto-capturing data now!")
                        return await self.simulate_data_capture()

        except KeyboardInterrupt:
            print("\n[STOP] Demo stopped by user")
            return None

    async def simulate_data_capture(self):
        """Simulate capturing data from a rental website"""
        print("[DATA] Simulating data extraction...")
        await asyncio.sleep(1)

        # Simulate found data
        simulated_data = {
            "url": "https://boulevardatgrantpark.com/",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "prices_found": ["$1,895/month", "$2,150/month", "$1,650/month"],
            "units_found": ["1 Bedroom", "2 Bedroom", "Studio"],
            "page_title": "Boulevard at Grant Park - Luxury Apartments"
        }

        print("[DATA] Captured data:")
        print(f"   [URL] {simulated_data['url']}")
        print(f"   [TITLE] {simulated_data['page_title']}")
        print(f"   [PRICES] {len(simulated_data['prices_found'])} found: {simulated_data['prices_found']}")
        print(f"   [UNITS] {len(simulated_data['units_found'])} found: {simulated_data['units_found']}")

        return simulated_data

async def main():
    """Main demo function"""
    print("[START] Activity Monitor Demo System")
    print("[START] Testing activity detection and auto-capture!")
    print("=" * 50)

    demo = ActivityMonitorDemo()

    try:
        result = await demo.demo_activity_monitoring()

        if result:
            print("\n[SUCCESS] Demo completed successfully!")
            print("[RESULT] Activity monitoring and auto-capture working correctly")

            # Save demo results
            import json
            filename = "demo_activity_results.json"
            with open(filename, 'w') as f:
                json.dump(result, f, indent=2)

            print(f"[SAVE] Demo results saved: {filename}")

        else:
            print("\n[INFO] Demo was cancelled")

    except Exception as e:
        print(f"\n[ERROR] Demo error: {e}")

if __name__ == "__main__":
    asyncio.run(main())