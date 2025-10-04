#!/usr/bin/env python3
"""
Enhanced Stealth Browser System
Advanced Cloudflare bypass with multiple evasion techniques
"""

import asyncio
import random
import time
import json
from typing import Optional, Dict, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page


class EnhancedStealthBypass:
    """Advanced stealth browser with multiple anti-detection layers"""

    def __init__(self):
        self.user_agents = self._load_user_agents()
        self.stealth_configs = self._load_stealth_configs()

    def _load_user_agents(self) -> List[str]:
        """Load diverse, realistic user agents"""
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]

    def _load_stealth_configs(self) -> Dict:
        """Load comprehensive stealth configurations"""
        return {
            'chrome_runtime': '''
                // Remove webdriver property
                delete Object.getPrototypeOf(navigator).webdriver;

                // Spoof plugins with realistic data
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer'},
                        {name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'},
                        {name: 'Native Client', description: '', filename: 'internal-nacl-plugin'}
                    ],
                });

                // Realistic languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en', 'es'],
                });

                // Spoof hardware concurrency
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 8,
                });

                // Spoof device memory
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => 8,
                });

                // Realistic screen properties
                Object.defineProperty(screen, 'availHeight', {
                    get: () => 1040,
                });
                Object.defineProperty(screen, 'availWidth', {
                    get: () => 1920,
                });
                Object.defineProperty(screen, 'height', {
                    get: () => 1080,
                });
                Object.defineProperty(screen, 'width', {
                    get: () => 1920,
                });

                // Spoof timezone
                Object.defineProperty(Intl, 'DateTimeFormat', {
                    value: class extends Intl.DateTimeFormat {
                        resolvedOptions() {
                            const options = super.resolvedOptions();
                            options.timeZone = 'America/New_York';
                            return options;
                        }
                    }
                });

                // Override permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        parameters.name === 'geolocation' ?
                            Promise.resolve({ state: 'prompt' }) :
                            originalQuery(parameters)
                );

                // Add realistic timing variations
                const originalGetTime = Date.prototype.getTime;
                Date.prototype.getTime = function() {
                    return originalGetTime.call(this) + Math.random() * 10;
                };
            ''',

            'behavior_patterns': {
                'mouse_movements': [
                    {'x': 100, 'y': 200, 'delay': 0.5},
                    {'x': 300, 'y': 400, 'delay': 0.8},
                    {'x': 500, 'y': 300, 'delay': 0.6},
                    {'x': 700, 'y': 500, 'delay': 1.0},
                ],
                'scroll_patterns': [
                    {'amount': 300, 'delay': 0.5},
                    {'amount': 600, 'delay': 0.8},
                    {'amount': 200, 'delay': 0.4},
                ],
                'typing_delays': [0.1, 0.15, 0.2, 0.08, 0.12],
            }
        }

    async def create_enhanced_stealth_browser(self, playwright) -> tuple[Page, Browser, BrowserContext]:
        """Create browser with maximum stealth capabilities"""
        print("[STEALTH] Initializing enhanced stealth browser...")

        # Random user agent
        user_agent = random.choice(self.user_agents)
        print(f"[STEALTH] Using user agent: {user_agent[:50]}...")

        # Launch browser with stealth args
        browser = await playwright.chromium.launch(
            headless=False,  # Keep visible for human-like behavior
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--disable-default-apps',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-ipc-flooding-protection',
                '--no-default-browser-check',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-background-timer-throttling',
                '--disable-popup-blocking',
                '--disable-translate',
                '--disable-component-extensions-with-background-pages',
                '--disable-background-networking',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-field-trial-config',
                '--disable-back-forward-cache',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-prompt-on-repost',
                '--force-color-profile=srgb',
                '--metrics-recording-only',
                '--no-crash-upload',
                '--disable-logging',
                '--disable-login-animations',
                '--disable-notifications',
                '--disable-permissions-api',
                '--disable-session-crashed-bubble',
                '--disable-infobars',
                f'--user-agent={user_agent}',
            ]
        )

        # Create context with additional stealth
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=user_agent,
            java_script_enabled=True,
            locale='en-US',
            timezone_id='America/New_York',
            permissions=['geolocation'],
            extra_http_headers={
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            }
        )

        # Add comprehensive stealth scripts
        await context.add_init_script(self.stealth_configs['chrome_runtime'])

        # Add additional evasion scripts
        await context.add_init_script('''
            // Override navigator properties
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

            // Spoof battery API
            if ('getBattery' in navigator) {
                navigator.getBattery = () => Promise.resolve({
                    charging: true,
                    chargingTime: Infinity,
                    dischargingTime: Infinity,
                    level: 0.8
                });
            }

            // Spoof connection API
            if ('connection' in navigator) {
                Object.defineProperty(navigator, 'connection', {
                    get: () => ({
                        effectiveType: '4g',
                        rtt: 50,
                        downlink: 2,
                        saveData: false
                    })
                });
            }

            // Override iframe detection
            Object.defineProperty(window, 'top', { get: () => window });
            Object.defineProperty(window, 'parent', { get: () => window });

            // Add realistic mouse events
            let mouseX = 0, mouseY = 0;
            document.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
            });

            // Override screen properties with slight randomization
            const baseWidth = 1920, baseHeight = 1080;
            Object.defineProperty(screen, 'width', { get: () => baseWidth + Math.floor(Math.random() * 10) });
            Object.defineProperty(screen, 'height', { get: () => baseHeight + Math.floor(Math.random() * 10) });
            Object.defineProperty(screen, 'availWidth', { get: () => baseWidth - 40 + Math.floor(Math.random() * 20) });
            Object.defineProperty(screen, 'availHeight', { get: () => baseHeight - 40 + Math.floor(Math.random() * 20) });
        ''')

        page = await context.new_page()

        # Add page-level stealth
        await page.add_script_tag(content='''
            // Override console methods to avoid detection
            const originalLog = console.log;
            console.log = (...args) => {
                if (!args[0] || !args[0].includes('webdriver')) {
                    originalLog.apply(console, args);
                }
            };

            // Add realistic page timing
            if (!window.performance.timing.navigationStart) {
                window.performance.timing.navigationStart = Date.now() - Math.random() * 1000;
            }
        ''')

        print("[STEALTH] Enhanced stealth browser ready")
        return page, browser, context

    async def navigate_with_enhanced_bypass(self, page, url: str, max_retries: int = 3) -> bool:
        """Navigate with enhanced Cloudflare bypass techniques"""
        print(f"[NAVIGATE] Enhanced navigation to: {url}")

        for attempt in range(max_retries):
            try:
                print(f"[NAVIGATE] Attempt {attempt + 1}/{max_retries}")

                # Pre-navigation stealth setup
                await self._pre_navigation_setup(page)

                # Add random delay before navigation
                delay = random.uniform(1.0, 3.0)
                print(f"[NAVIGATE] Pre-navigation delay: {delay:.1f}s")
                await asyncio.sleep(delay)

                # Navigate with timeout
                await page.goto(url, wait_until='domcontentloaded', timeout=45000)

                # Post-navigation verification and challenge handling
                if await self._handle_cloudflare_challenge(page):
                    print("[SUCCESS] Navigation successful with enhanced stealth!")
                    return True
                else:
                    print(f"[WARNING] Challenge handling failed on attempt {attempt + 1}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(random.uniform(5, 10))

            except Exception as e:
                print(f"[ERROR] Navigation attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(random.uniform(3, 7))

        print("[ERROR] All navigation attempts failed")
        return False

    async def _pre_navigation_setup(self, page):
        """Setup before navigation to maximize stealth"""
        # Clear any existing cookies that might indicate automation
        await page.context.clear_cookies()

        # Set additional headers
        await page.set_extra_http_headers({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        })

        # Simulate human-like behavior before navigation
        await self._simulate_human_behavior(page)

    async def _simulate_human_behavior(self, page):
        """Simulate human browsing behavior"""
        try:
            # Random mouse movements
            for movement in self.stealth_configs['behavior_patterns']['mouse_movements']:
                await page.mouse.move(movement['x'], movement['y'])
                await asyncio.sleep(movement['delay'] + random.uniform(0, 0.5))

            # Random scrolling
            for scroll in self.stealth_configs['behavior_patterns']['scroll_patterns']:
                await page.evaluate(f"window.scrollBy(0, {scroll['amount']})")
                await asyncio.sleep(scroll['delay'] + random.uniform(0, 0.3))

        except Exception as e:
            print(f"[WARNING] Human behavior simulation error: {e}")

    async def _handle_cloudflare_challenge(self, page) -> bool:
        """Handle Cloudflare challenge detection and resolution"""
        print("[CHALLENGE] Checking for Cloudflare protection...")

        # Wait for potential challenge to load
        await asyncio.sleep(3)

        # Check for common Cloudflare indicators
        content = await page.content()
        title = await page.title()

        cloudflare_indicators = [
            'cloudflare' in content.lower(),
            'challenge' in content.lower(),
            'verifying you are human' in content.lower(),
            'checking your browser' in content.lower(),
            'cf-browser-verification' in content.lower(),
            'cf-challenge' in title.lower(),
            '__cf_chl_jschl_tk__' in content,
            'cf-ray' in str(await page.context.cookies()),
        ]

        if any(cloudflare_indicators):
            print("[CHALLENGE] Cloudflare challenge detected, attempting bypass...")

            # Wait for challenge resolution with human-like timing
            max_wait = 60  # 60 seconds max
            for i in range(max_wait):
                await asyncio.sleep(1)

                # Check if challenge is resolved
                current_content = await page.content()
                current_title = await page.title()

                if ('cloudflare' not in current_content.lower() and
                    'challenge' not in current_content.lower() and
                    'checking your browser' not in current_content.lower()):
                    print(f"[SUCCESS] Cloudflare challenge resolved after {i+1} seconds!")
                    return True

                if (i + 1) % 10 == 0:
                    print(f"[CHALLENGE] Still waiting... ({i+1}/{max_wait}s)")

            print("[ERROR] Cloudflare challenge resolution timeout")
            return False

        else:
            print("[CHALLENGE] No Cloudflare challenge detected")
            return True

    async def perform_stealth_actions(self, page):
        """Perform additional stealth actions during browsing"""
        try:
            # Random page interactions
            actions = [
                lambda: page.mouse.move(random.randint(100, 800), random.randint(100, 600)),
                lambda: page.evaluate("window.scrollBy(0, Math.random() * 200)"),
                lambda: asyncio.sleep(random.uniform(0.5, 2.0)),
            ]

            # Perform 2-4 random actions
            for _ in range(random.randint(2, 4)):
                action = random.choice(actions)
                if asyncio.iscoroutinefunction(action):
                    await action()
                else:
                    action()
                await asyncio.sleep(random.uniform(0.5, 1.5))

        except Exception as e:
            print(f"[WARNING] Stealth action error: {e}")


# Enhanced Activity Monitor with better stealth
class EnhancedActivityMonitorTrainer:
    """Activity monitor with enhanced stealth capabilities"""

    def __init__(self):
        self.stealth = EnhancedStealthBypass()

    async def train_with_enhanced_stealth(self, url: str):
        """Train with maximum stealth capabilities"""
        print("[ENHANCED] Starting enhanced stealth training...")
        print("[ENHANCED] Multi-layer anti-detection active")

        async with async_playwright() as p:
            page, browser, context = await self.stealth.create_enhanced_stealth_browser(p)

            try:
                # Enhanced navigation
                success = await self.stealth.navigate_with_enhanced_bypass(page, url)

                if success:
                    print("[SUCCESS] Enhanced stealth navigation successful!")
                    print("[SUCCESS] Activity monitoring ready")

                    # Set up activity monitoring
                    await self._setup_enhanced_activity_monitoring(page)

                    # Monitor activity with stealth actions
                    result = await self._monitor_with_stealth_actions(page)

                    if result:
                        print("[SUCCESS] Enhanced training completed!")
                        return result

                else:
                    print("[ERROR] Enhanced stealth navigation failed")
                    return None

            except Exception as e:
                print(f"[ERROR] Enhanced training error: {e}")
                return None

            finally:
                await browser.close()

    async def _setup_enhanced_activity_monitoring(self, page):
        """Set up activity monitoring with stealth enhancements"""
        await page.add_script_tag(content="""
            window.lastActivityTime = Date.now();
            window.activityEvents = [];

            function logActivity(type, details = {}) {
                window.lastActivityTime = Date.now();
                window.activityEvents.push({
                    type: type,
                    time: Date.now(),
                    ...details
                });
            }

            // Enhanced event monitoring
            document.addEventListener('mousedown', (e) => logActivity('mousedown', {x: e.clientX, y: e.clientY}));
            document.addEventListener('mousemove', (e) => logActivity('mousemove', {x: e.clientX, y: e.clientY}));
            document.addEventListener('click', (e) => logActivity('click', {x: e.clientX, y: e.clientY}));
            document.addEventListener('scroll', () => logActivity('scroll', {scrollY: window.scrollY}));
            document.addEventListener('keydown', (e) => logActivity('keydown', {key: e.key}));
            document.addEventListener('keyup', (e) => logActivity('keyup', {key: e.key}));
            document.addEventListener('focus', () => logActivity('focus'));
            document.addEventListener('blur', () => logActivity('blur'));

            // Monitor form interactions
            document.addEventListener('input', (e) => logActivity('input', {type: e.target.type}));
            document.addEventListener('change', (e) => logActivity('change', {type: e.target.type}));
        """)

    async def _monitor_with_stealth_actions(self, page):
        """Monitor activity while performing stealth actions"""
        print("[MONITOR] Enhanced activity monitoring active")
        print("[MONITOR] Performing stealth actions during monitoring...")

        start_time = time.time()
        last_stealth_action = 0

        while time.time() - start_time < 120:  # 2 minute monitoring session
            try:
                # Perform stealth actions periodically
                current_time = time.time()
                if current_time - last_stealth_action > random.uniform(10, 20):
                    await self.stealth.perform_stealth_actions(page)
                    last_stealth_action = current_time

                # Check activity
                last_activity = await page.evaluate("window.lastActivityTime")
                time_since_activity = current_time - (last_activity / 1000)

                if time_since_activity > 30:  # 30 seconds of inactivity
                    print("[CAPTURE] Inactivity detected, auto-capturing data...")
                    return await self._capture_enhanced_data(page)

                await asyncio.sleep(1)

            except Exception as e:
                print(f"[ERROR] Monitoring error: {e}")
                await asyncio.sleep(2)

        # Session timeout - capture anyway for demo
        print("[TIMEOUT] Session timeout, capturing final data...")
        return await self._capture_enhanced_data(page)

    async def _capture_enhanced_data(self, page):
        """Capture data with enhanced extraction"""
        try:
            url = page.url
            title = await page.title()
            content = await page.content()

            # Enhanced data extraction
            rental_data = await self._extract_comprehensive_rental_data(page)

            result = {
                "url": url,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "page_title": title,
                "stealth_level": "enhanced",
                "extraction_method": "activity_monitor_enhanced",
                "rental_data": rental_data,
                "activity_events": await page.evaluate("window.activityEvents.length"),
            }

            print("[DATA] Enhanced capture complete:")
            print(f"   [TITLE] {title}")
            print(f"   [PRICES] {len(rental_data.get('prices', []))} found")
            print(f"   [UNITS] {len(rental_data.get('units', []))} found")
            print(f"   [ACTIVITY] {result['activity_events']} events recorded")

            return result

        except Exception as e:
            print(f"[ERROR] Enhanced capture error: {e}")
            return None

    async def _extract_comprehensive_rental_data(self, page):
        """Extract rental data using multiple strategies"""
        data = {
            "prices": [],
            "units": [],
            "features": [],
            "availability": []
        }

        try:
            # Multiple selector strategies
            selectors = {
                "prices": [
                    ".price", ".rent", ".pricing", ".cost", ".amount", ".monthly",
                    "[class*='price']", "[class*='rent']", "[data-price]", "[data-rent]",
                    ".rate", ".fee", "[class*='rate']", "[class*='amount']"
                ],
                "units": [
                    ".unit", ".apartment", ".floorplan", ".property", ".plan",
                    "[class*='unit']", "[class*='apartment']", "[data-unit]",
                    ".bedroom", ".bathroom", "[class*='bedroom']", ".unit-type"
                ],
                "features": [
                    ".features", ".amenities", ".description", "[class*='feature']",
                    "[class*='amenity']", ".details"
                ],
                "availability": [
                    ".availability", ".status", "[class*='available']", ".date"
                ]
            }

            for data_type, selector_list in selectors.items():
                for selector in selector_list:
                    try:
                        elements = page.locator(selector)
                        count = await elements.count()

                        for i in range(min(count, 10)):  # Limit per selector
                            text = await elements.nth(i).text_content()
                            if text and len(text.strip()) > 1:
                                data[data_type].append(text.strip()[:200])  # Limit length

                    except:
                        continue

                # Remove duplicates
                data[data_type] = list(set(data[data_type]))

        except Exception as e:
            print(f"[WARNING] Comprehensive extraction error: {e}")

        return data


async def main():
    """Test enhanced stealth system"""
    if len(sys.argv) < 2:
        print("Usage: python enhanced_stealth_system.py <url>")
        print("Example: python enhanced_stealth_system.py https://highlandsatsweetwatercreek.com/")
        sys.exit(1)

    url = sys.argv[1]

    print("[ENHANCED] Enhanced Stealth Activity Monitor")
    print("[ENHANCED] Multi-layer anti-detection system")
    print("=" * 50)

    trainer = EnhancedActivityMonitorTrainer()

    try:
        result = await trainer.train_with_enhanced_stealth(url)

        if result:
            print("\n[SUCCESS] Enhanced stealth training completed!")

            # Save enhanced results
            filename = f"enhanced_stealth_results_{int(time.time())}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Enhanced results saved: {filename}")

            # Show summary
            rental_data = result.get('rental_data', {})
            print("\n[SUMMARY] Enhanced Extraction Results:")
            print(f"   Prices found: {len(rental_data.get('prices', []))}")
            print(f"   Units found: {len(rental_data.get('units', []))}")
            print(f"   Features found: {len(rental_data.get('features', []))}")
            print(f"   Availability info: {len(rental_data.get('availability', []))}")

        else:
            print("\n[ERROR] Enhanced stealth training failed")

    except KeyboardInterrupt:
        print("\n[STOP] Enhanced training stopped")
    except Exception as e:
        print(f"\n[ERROR] Enhanced system error: {e}")


if __name__ == "__main__":
    asyncio.run(main())