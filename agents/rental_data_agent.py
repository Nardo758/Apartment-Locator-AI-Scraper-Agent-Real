import os
import json
import asyncio
import base64
import random
import time
import re
from io import BytesIO
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Human-like timing configuration
HUMAN_TIMING_PROFILE = {
    "page_load_observation": (3, 8),      # 3-8 seconds looking at loaded page
    "reading_speed": (0.1, 0.3),          # 100-300ms per "glance" at elements
    "mouse_movements": (0.5, 2.0),        # 0.5-2s between interactions
    "decision_pause": (1, 4),             # 1-4s "thinking" before clicking
    "scroll_behavior": (0.3, 1.2),        # Variable scroll speeds
    "multi_page_delay": (8, 15),          # 8-15s between page navigations
    "element_hover": (0.2, 0.8),          # Brief hover before interaction
    "typing_speed": (0.1, 0.3),           # Human typing speed if needed
}

# Lease term preferences for intelligent selection
LEASE_TERM_PREFERENCES = {
    "ideal": [12],           # Perfect match
    "excellent": [11, 13],   # Very close
    "good": [14, 15, 16],    # Reasonable
    "acceptable": [17, 18],  # Longer but ok
    "fallback": [6, 7, 8, 9, 10, 19, 20, 21, 22, 23, 24]  # Last resort
}

@dataclass
class RentalData:
    """Data structure for rental pricing information"""
    floorplan_name: str
    bedrooms: int
    bathrooms: float
    sqft: Optional[int] = None
    monthly_rent: float = 0.0
    lease_term_months: int = 12
    lease_term: Optional[str] = None  # Descriptive lease term (e.g., "12 months", "flexible")
    concessions: Optional[str] = None
    availability_date: Optional[str] = None
    availability_status: str = 'available'
    confidence_score: float = 0.0
    data_source: str = 'vision_agent'
    raw_data: Optional[Dict] = None

class RentalDataAgent:
    sqft: Optional[int] = None
    monthly_rent: float = 0.0
    lease_term_months: int = 12
    concessions: Optional[str] = None
    availability_date: Optional[str] = None
    availability_status: str = 'available'
    confidence_score: float = 0.0
    data_source: str = 'vision_agent'
    raw_data: Optional[Dict] = None

class RentalDataAgent:
    """
    Rental Data Agent - Vision/Cognitive agent for extracting detailed rental
    pricing information from complex multi-page apartment websites.
    """

    def __init__(self, openai_api_key: str = None, claude_api_key: str = None, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize the Rental Data Agent

        Args:
            openai_api_key: Deepseek API key for R1 vision analysis
            claude_api_key: Anthropic Claude API key (alternative vision model)
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
        """
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        self.claude_api_key = claude_api_key or os.getenv('ANTHROPIC_API_KEY')
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        # Initialize Supabase client
        if self.supabase_url and self.supabase_key:
            from supabase import create_client
            self.supabase = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None
            logger.warning("Supabase credentials not provided - database operations will be skipped")

        # Vision model configuration - using OpenAI GPT-4o (Deepseek doesn't support vision)
        self.vision_model = "gpt-4o"  # OpenAI GPT-4V (vision-capable)
        self.vision_max_tokens = 2000
        self.vision_temperature = 0.1

        # Browser configuration
        self.browser = None
        self.context = None
        self.page = None

        # Processing limits
        self.max_pages_per_property = 10
        self.page_timeout = 30000  # 30 seconds (base timeout)
        self.long_timeout = 60000  # 60 seconds for slow-loading sites
        self.element_timeout = 10000  # 10 seconds

        # Site-specific navigation configuration
        self.max_retries = 3
        self.retry_delays = [5, 10, 20]  # seconds between retries
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

        # Site-specific configurations for problematic websites
        self.site_configs = {
            'thecollectiveuws.com': {
                'timeout_multiplier': 3,  # 3x normal timeout (90 seconds)
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'wait_after_load': 10,  # Extra wait time after page load
                'navigation_selectors': [
                    'a[href*="floor-plans"]',
                    'a[href*="floorplans"]',
                    'button:has-text("Floor Plans")',
                    '.floor-plans-link',
                    '#floor-plans-link'
                ],
                'headless': False,  # Try non-headless for this site
                'use_long_timeout': True  # Use 60+ second timeout
            },
            'novelwestmidtown.com': {
                'timeout_multiplier': 2,  # 2x normal timeout (60 seconds)
                'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'wait_after_load': 5,
                'navigation_selectors': [
                    'a[href*="floor-plan"]',
                    'a[href*="pricing"]',
                    '.floor-plans',
                    '#pricing'
                ],
                'use_long_timeout': True
            },
            'altaporter.com': {
                'timeout_multiplier': 2,  # 2x normal timeout (60 seconds)
                'user_agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'wait_after_load': 5,
                'navigation_selectors': [
                    'a[href*="floorplans"]',
                    'a[href*="rentals"]',
                    '.units',
                    '#units'
                ],
                'use_long_timeout': True
            }
        }

        # Cookie handling state tracking
        self._cookies_handled = False  # Track if cookies have been handled for current page

        # Hybrid agent routing configuration
        self.hybrid_routing = {
            'enabled': True,
            'primary_agent': 'vision',  # 'vision' or 'text'
            'fallback_agent': 'text',   # 'text' or 'vision'
            'text_agent_model': 'claude-3-haiku-20240307',
            'vision_agent_model': 'gpt-4o'
        }

        # Human-like behavior configuration
        self.human_timing = HUMAN_TIMING_PROFILE
        self.stealth_mode = False  # Enable for maximum human-like behavior

        # Failure pattern detection
        self.failure_patterns = {
            'vision_extraction_failures': {},  # Track sites that fail vision extraction
            'timeout_failures': {},  # Track sites with timeout issues
            'empty_results': {},  # Track sites that return no data
            'max_failures_before_skip': 3,  # Skip site after this many failures
            'failure_window_hours': 24  # Reset failure count after this many hours
        }

    async def __aenter__(self):
        """Async context manager entry"""
        await self._init_browser()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self._cleanup_browser()

    async def _init_browser(self):
        """Initialize Playwright browser"""
        try:
            from playwright.async_api import async_playwright

            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,  # Run in background
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',  # Helps with Windows
                    '--disable-gpu'
                ]
            )

            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )

            self.page = await self.context.new_page()
            logger.info("Browser initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize browser: {str(e)}")
            raise

    async def _cleanup_browser(self):
        """Clean up browser resources"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
            logger.info("Browser cleanup completed")
        except Exception as e:
            logger.error(f"Error during browser cleanup: {str(e)}")

    async def extract_rental_data_with_retry(self, property_url: str, property_id: int = None) -> List[RentalData]:
        """
        Extract rental data from a property URL with comprehensive retry logic

        Args:
            property_url: URL of the apartment property to scrape
            property_id: ID from properties_basic table (optional)

        Returns:
            List of RentalData objects with pricing information
        """
        logger.info(f"Starting rental data extraction with retry logic for: {property_url}")

        # Check failure patterns before attempting extraction
        if self._should_skip_site(property_url, 'timeout_failures'):
            logger.warning(f"Skipping {property_url} due to timeout failure pattern")
            return []
        if self._should_skip_site(property_url, 'vision_extraction_failures'):
            logger.warning(f"Skipping {property_url} due to vision extraction failure pattern")
            return []
        if self._should_skip_site(property_url, 'empty_results'):
            logger.warning(f"Skipping {property_url} due to empty results pattern")
            return []

        # Check if this is a known problematic site
        site_config = self._get_site_config(property_url)

        for attempt in range(self.max_retries):
            try:
                logger.info(f"Extraction attempt {attempt + 1}/{self.max_retries} for {property_url}")

                # Apply site-specific configuration if available
                if site_config:
                    await self._apply_site_config(site_config, attempt)
                else:
                    # Set different user agent for each retry
                    user_agent = self.user_agents[attempt % len(self.user_agents)]
                    await self.page.set_extra_http_headers({'User-Agent': user_agent})
                    logger.info(f"Using user agent: {user_agent[:50]}...")

                # Call the main extraction method
                result = await self.extract_rental_data(property_url, property_id)

                if result:  # If we got data, return it
                    logger.info(f"Successful extraction on attempt {attempt + 1}")
                    return result
                else:
                    # Record empty results failure
                    self._record_failure(property_url, 'empty_results')

            except Exception as e:
                error_msg = str(e).lower()
                logger.warning(f"Attempt {attempt + 1} failed for {property_url}: {str(e)}")

                # Categorize the failure type
                if 'timeout' in error_msg:
                    self._record_failure(property_url, 'timeout_failures')
                elif 'vision' in error_msg or 'extraction' in error_msg:
                    self._record_failure(property_url, 'vision_extraction_failures')
                else:
                    self._record_failure(property_url, 'timeout_failures')  # Default to timeout

                # If this isn't the last attempt, wait before retrying
                if attempt < self.max_retries - 1:
                    delay = self.retry_delays[attempt] if attempt < len(self.retry_delays) else self.retry_delays[-1]
                    logger.info(f"Waiting {delay} seconds before retry...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All {self.max_retries} attempts failed for {property_url}")

        # All retries exhausted
        logger.error(f"Failed to extract data from {property_url} after {self.max_retries} attempts")
        return []

    def _get_site_config(self, property_url: str) -> Optional[Dict]:
        """Get site-specific configuration for known problematic websites"""
        from urllib.parse import urlparse

        domain = urlparse(property_url).netloc.lower()
        # Remove www. prefix if present
        domain = domain.replace('www.', '')

        return self.site_configs.get(domain)

    async def _apply_site_config(self, site_config: Dict, attempt: int):
        """Apply site-specific configuration for the current attempt"""
        # Set site-specific user agent
        user_agent = site_config.get('user_agent', self.user_agents[attempt % len(self.user_agents)])
        await self.page.set_extra_http_headers({'User-Agent': user_agent})
        logger.info(f"Using site-specific user agent: {user_agent[:50]}...")

        # Adjust timeouts for this site
        if site_config.get('use_long_timeout', False):
            self.page_timeout = self.long_timeout
            logger.info(f"Using long timeout: {self.page_timeout}ms for this site")
        else:
            timeout_multiplier = site_config.get('timeout_multiplier', 1)
            original_timeout = 30000  # Base timeout
            self.page_timeout = int(original_timeout * timeout_multiplier)
            logger.info(f"Adjusted timeout to {self.page_timeout}ms for this site")

    async def _site_specific_navigation(self, property_url: str) -> bool:
        """Apply site-specific navigation logic for known problematic sites"""
        site_config = self._get_site_config(property_url)
        if not site_config:
            return False

        logger.info(f"Applying site-specific navigation for {property_url}")

        # Apply extra wait time after page load
        wait_time = site_config.get('wait_after_load', 0)
        if wait_time > 0:
            logger.info(f"Waiting {wait_time} seconds for site-specific loading...")
            await asyncio.sleep(wait_time)

        # Try site-specific navigation selectors
        navigation_selectors = site_config.get('navigation_selectors', [])
        for selector in navigation_selectors:
            try:
                element_count = await self.page.locator(selector).count()
                if element_count > 0:
                    logger.info(f"Found {element_count} elements with site-specific selector: {selector}")
                    await self.page.locator(selector).first.click(timeout=5000)
                    await asyncio.sleep(5)  # Wait for content to load
                    return True
            except Exception as e:
                logger.debug(f"Site-specific selector {selector} failed: {str(e)}")
                continue

        return False

    def _should_skip_site(self, property_url: str, failure_type: str) -> bool:
        """Check if a site should be skipped based on failure patterns"""
        from urllib.parse import urlparse
        from datetime import datetime, timedelta

        domain = urlparse(property_url).netloc.lower().replace('www.', '')

        failure_tracker = self.failure_patterns.get(failure_type, {})
        if domain not in failure_tracker:
            return False

        failures = failure_tracker[domain]
        # Clean old failures outside the window
        window_start = datetime.now() - timedelta(hours=self.failure_patterns['failure_window_hours'])
        recent_failures = [f for f in failures if f > window_start]

        # Update the tracker with cleaned failures
        failure_tracker[domain] = recent_failures

        should_skip = len(recent_failures) >= self.failure_patterns['max_failures_before_skip']
        if should_skip:
            logger.warning(f"Skipping {domain} due to {len(recent_failures)} recent {failure_type} failures")

        return should_skip

    def _record_failure(self, property_url: str, failure_type: str):
        """Record a failure for pattern detection"""
        from urllib.parse import urlparse
        from datetime import datetime

        domain = urlparse(property_url).netloc.lower().replace('www.', '')

        if failure_type not in self.failure_patterns:
            return

        failure_tracker = self.failure_patterns[failure_type]
        if domain not in failure_tracker:
            failure_tracker[domain] = []

        failure_tracker[domain].append(datetime.now())
        logger.warning(f"Recorded {failure_type} failure for {domain} (total: {len(failure_tracker[domain])})")

    async def _hybrid_extract_pricing(self, screenshot: bytes) -> List[Dict]:
        """Extract pricing using hybrid agent routing (text + vision fallback)"""
        if not self.hybrid_routing['enabled']:
            # Use primary agent only
            if self.hybrid_routing['primary_agent'] == 'vision':
                return await self._vision_extract_pricing(screenshot)
            else:
                return await self._text_extract_pricing(screenshot)

        # Try primary agent first
        primary_result = []
        if self.hybrid_routing['primary_agent'] == 'vision':
            logger.info("Trying vision extraction (primary)...")
            primary_result = await self._vision_extract_pricing(screenshot)
        else:
            logger.info("Trying text extraction (primary)...")
            primary_result = await self._text_extract_pricing(screenshot)

        if primary_result:
            logger.info(f"Primary agent successful: extracted {len(primary_result)} units")
            return primary_result

        # Fallback to secondary agent
        logger.info("Primary agent failed, trying fallback agent...")
        if self.hybrid_routing['fallback_agent'] == 'vision':
            logger.info("Trying vision extraction (fallback)...")
            fallback_result = await self._vision_extract_pricing(screenshot)
        else:
            logger.info("Trying text extraction (fallback)...")
            fallback_result = await self._text_extract_pricing(screenshot)

        if fallback_result:
            logger.info(f"Fallback agent successful: extracted {len(fallback_result)} units")
            return fallback_result

        logger.warning("Both primary and fallback agents failed")
        return []

    async def _text_extract_pricing(self, screenshot: bytes) -> List[Dict]:
        """Extract pricing using text-based Claude analysis"""
        try:
            # Convert screenshot to base64
            base64_image = base64.b64encode(screenshot).decode('utf-8')

            # Use Claude for text extraction
            import anthropic
            client = anthropic.Anthropic(api_key=self.claude_api_key)

            prompt = """
            Analyze this apartment website screenshot and extract all available rental pricing information.
            Look for floor plans, unit types, bedrooms, bathrooms, square footage, and monthly rent prices.

            Return a JSON array of unit objects with this exact format:
            [
                {
                    "floorplan_name": "Unit Name",
                    "bedrooms": number,
                    "bathrooms": number,
                    "square_footage": number,
                    "monthly_rent": "price range or single price",
                    "lease_term": "lease term if available",
                    "availability_status": "availability info"
                }
            ]

            Only return the JSON array, no other text.
            """

            response = client.messages.create(
                model=self.hybrid_routing['text_agent_model'],
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": base64_image}}
                        ]
                    }
                ]
            )

            result_text = response.content[0].text.strip()
            logger.info(f"Claude text extraction result: {result_text[:200]}...")

            # Parse JSON response
            try:
                units = json.loads(result_text)
                return units if isinstance(units, list) else []
            except json.JSONDecodeError:
                logger.error("Failed to parse Claude JSON response")
                return []

        except Exception as e:
            logger.error(f"Text extraction failed: {str(e)}")
            return []

    async def _vision_extract_pricing(self, screenshot: bytes) -> List[Dict]:
        """Extract pricing using vision-based GPT-4o analysis (existing method)"""
        return await self._extract_unit_pricing_from_screenshot(screenshot)

    # ===== HUMAN-LIKE BEHAVIOR METHODS =====

    async def human_delay(self, action_type: str):
        """Add realistic human delays based on action type"""
        delays = {
            "page_load": random.uniform(*self.human_timing["page_load_observation"]),
            "reading_text": random.uniform(*self.human_timing["reading_speed"]),
            "before_click": random.uniform(*self.human_timing["decision_pause"]),
            "between_clicks": random.uniform(*self.human_timing["mouse_movements"]),
            "scrolling": random.uniform(*self.human_timing["scroll_behavior"]),
            "page_navigation": random.uniform(*self.human_timing["multi_page_delay"]),
            "element_hover": random.uniform(*self.human_timing["element_hover"]),
        }

        delay = delays.get(action_type, 1.0)
        if self.stealth_mode:
            logger.debug(f"Human delay: {action_type} = {delay:.2f}s")
        await asyncio.sleep(delay)

    async def human_mouse_movement(self, selector: str):
        """Simulate natural mouse movements to target element"""
        try:
            element = await self.page.query_selector(selector)
            if not element:
                return

            # Get element position
            box = await element.bounding_box()
            if not box:
                return

            # Add slight randomization to target position
            target_x = box["x"] + box["width"] / 2 + random.randint(-10, 10)
            target_y = box["y"] + box["height"] / 2 + random.randint(-10, 10)

            # Get current mouse position
            current_pos = await self.page.evaluate("""
                () => ({x: window.mouseX || 0, y: window.mouseY || 0})
            """)

            # Calculate curved path (simple bezier-like curve)
            steps = random.randint(10, 25)
            control_x = (current_pos['x'] + target_x) / 2 + random.randint(-50, 50)
            control_y = (current_pos['y'] + target_y) / 2 + random.randint(-50, 50)

            # Move mouse in curved path
            for i in range(steps + 1):
                t = i / steps
                # Quadratic bezier curve
                x = (1 - t) * (1 - t) * current_pos['x'] + 2 * (1 - t) * t * control_x + t * t * target_x
                y = (1 - t) * (1 - t) * current_pos['y'] + 2 * (1 - t) * t * control_y + t * t * target_y

                await self.page.mouse.move(x, y, steps=1)
                await asyncio.sleep(0.01)  # Small delay between steps

            # Brief hover before clicking
            await self.human_delay("element_hover")

            # Update stored mouse position
            await self.page.evaluate(f"window.mouseX = {target_x}; window.mouseY = {target_y}")

        except Exception as e:
            logger.debug(f"Human mouse movement failed: {str(e)}")

    async def simulate_reading_behavior(self):
        """Simulate human reading patterns across page sections"""
        if not self.stealth_mode:
            return

        # Random "eye movements" across page sections
        sections = ["header", "navigation", "content", "pricing", "sidebar", "footer"]
        sections_to_read = random.sample(sections, random.randint(2, 4))

        for section in sections_to_read:
            await self.human_delay("reading_text")

            # Occasional micro-movements within section
            if random.random() > 0.6:  # 40% chance
                await self.page.mouse.move(
                    random.randint(100, 800),
                    random.randint(100, 600),
                    steps=random.randint(5, 15)
                )

        # Occasional scrolls (like human reading)
        if random.random() > 0.3:  # 70% chance of scrolling
            await self.human_delay("scrolling")
            scroll_pixels = random.randint(200, 600)
            await self.page.evaluate(f"window.scrollBy(0, {scroll_pixels})")

            # Brief pause after scrolling
            await self.human_delay("reading_text")

    async def human_scroll_behavior(self):
        """Scroll like a human (not smooth, with pauses)"""
        if not self.stealth_mode:
            return

        scroll_actions = random.randint(2, 6)

        for _ in range(scroll_actions):
            # Variable scroll amounts
            scroll_pixels = random.randint(200, 800)
            await self.page.evaluate(f"window.scrollBy(0, {scroll_pixels})")

            # Random pause during scrolling
            if random.random() > 0.7:  # 30% chance to pause mid-scroll
                await self.human_delay("reading_text")

            # Brief delay between scroll actions
            await asyncio.sleep(random.uniform(0.3, 1.0))

    async def variable_reading_speed(self, text_content: str):
        """Read at human-like variable speeds"""
        if not self.stealth_mode or not text_content:
            return

        words = text_content.split()
        reading_speed_wpm = random.randint(200, 400)  # Humans vary

        # Simulate reading time for content
        reading_time = len(words) / (reading_speed_wpm / 60)
        reading_time += random.uniform(0.5, 2.0)  # Add comprehension time

        # Cap at reasonable time
        actual_reading_time = min(reading_time, 10)
        await asyncio.sleep(actual_reading_time)

    async def enable_stealth_mode(self):
        """Enable maximum human-like behavior"""
        self.stealth_mode = True
        logger.info("🕵️ Stealth mode enabled - using human-like timing and behavior")

        # Configure browser for stealth
        if self.context:
            await self.context.add_init_script("""
                // Remove automation indicators
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                // Randomize viewport occasionally
                window.mouseX = Math.random() * 800;
                window.mouseY = Math.random() * 600;
            """)

    async def human_like_page_load(self, url: str):
        """Load page with human-like behavior and cookie handling"""
        await self.page.goto(url, wait_until='networkidle', timeout=self.page_timeout)

        if self.stealth_mode:
            # Initial observation delay
            await self.human_delay("page_load")

            # Handle any cookie popups that appeared
            await self.handle_cookie_popups()

            # Simulate reading the loaded page
            await self.simulate_reading_behavior()

            # Random initial scroll
            if random.random() > 0.4:  # 60% chance
                await self.human_scroll_behavior()

    async def human_like_click(self, selector: str):
        """Click element with human-like behavior"""
        if self.stealth_mode:
            # Move mouse to element with human movement
            await self.human_mouse_movement(selector)

            # Decision pause before clicking
            await self.human_delay("before_click")

        # Perform the click
        await self.page.click(selector, timeout=self.element_timeout)

        if self.stealth_mode:
            # Brief pause after clicking
            await self.human_delay("between_clicks")

    # ===== COMPREHENSIVE COOKIE HANDLING SYSTEM =====

    async def handle_cookie_popups(self) -> bool:
        """Detect and handle cookie consent popups - prioritize REJECTION over acceptance"""
        logger.info("🍪 Checking for cookie popups...")

        # PRIORITY 1: Reject/Decline/No buttons (what we want)
        reject_selectors = [
            # Reject/Decline/No buttons
            "text=Reject All",
            "text=Decline",
            "text=Decline All",
            "text=No Thanks",
            "text=I Decline",
            "text=Deny",
            "text=Deny All",
            "text=Refuse",
            "text=Opt Out",
            "text=Don't Accept",
            "button[data-action='reject-all']",
            "button[data-action='decline']",
            "[data-testid='uc-reject-all-button']",
            "[data-testid='uc-deny-all-button']",
            ".cookie-reject",
            ".gdpr-reject",
            "#onetrust-reject-all-handler",
            ".onetrust-reject-all-handler",
            "button#rejectCookies",
            "button[class*='reject']",
            "button[class*='decline']",
            "input[value*='reject']",
            "input[value*='decline']",
        ]

        # Try reject buttons first
        for selector in reject_selectors:
            try:
                element = await self.page.query_selector(selector)
                if element and await self.is_visible(element):
                    logger.info(f"🍪 Found REJECT button, clicking: {selector}")
                    await self.human_like_click(selector)
                    await self.human_delay("between_clicks")
                    # Mark that we've handled cookies for this page
                    self._cookies_handled = True
                    return True
            except Exception as e:
                logger.debug(f"Reject selector {selector} failed: {str(e)}")
                continue

        # PRIORITY 2: Close/Dismiss buttons (second best - just close the popup)
        close_selectors = [
            "button[aria-label*='close']",
            "button[class*='close']",
            ".close-cookies",
            ".cookie-banner .close",
            "[data-close*='cookie']",
            ".cookie-modal .close",
            "[aria-label*='close']",
            ".modal-close",
            ".popup-close",
            "[data-dismiss='modal']",
            ".close-button",
            "text=×",
            "text=X",
            "text=Close",
            ".onetrust-close-btn-handler",
        ]

        # Try close buttons second
        for selector in close_selectors:
            try:
                element = await self.page.query_selector(selector)
                if element and await self.is_visible(element):
                    logger.info(f"🍪 Found CLOSE button, clicking: {selector}")
                    await self.human_like_click(selector)
                    await self.human_delay("between_clicks")
                    # Mark that we've handled cookies for this page
                    self._cookies_handled = True
                    return True
            except Exception as e:
                logger.debug(f"Close selector {selector} failed: {str(e)}")
                continue

        # PRIORITY 3: Accept buttons (only if we can't reject or close)
        # This is last resort - we prefer to reject cookies
        # But if we get here, it means we couldn't reject, so let's be more careful
        accept_selectors = [
            "text=Accept All",
            "text=Agree",
            "text=Accept Cookies",
            "text=I Accept",
            "text=Allow All",
            "text=Got It",
            "text=Accept",
            "text=OK",
            "button#acceptCookies",
            "button[aria-label*='cookie']",
            "button[class*='cookie']",
            "input[value*='accept']",
            "a[href*='cookie' i]",
            "#onetrust-accept-btn-handler",
            ".onetrust-close-btn-handler",
            "[data-testid='uc-accept-all-button']",
            "[data-testid='uc-accept-all-banner']",
            ".onetrust-banner-container button",
            "#onetrust-pc-btn-handler",
            ".ot-sdk-btn.ot-sdk-btn-primary",
            "button[data-action='accept-all']",
            "button[data-action='accept']",
            ".cookie-consent__button--accept",
            ".gdpr-banner__button--accept",
            ".cookie-consent button",
            ".gdpr-consent button",
            ".cc-banner button",
            "#cookieBanner button",
            ".cookie-popup button",
        ]

        # Only accept as ABSOLUTE last resort - try to avoid accepting cookies
        found_accept_buttons = []
        for selector in accept_selectors:
            try:
                element = await self.page.query_selector(selector)
                if element and await self.is_visible(element):
                    found_accept_buttons.append((selector, element))
            except Exception as e:
                logger.debug(f"Accept selector check {selector} failed: {str(e)}")
                continue

        if found_accept_buttons:
            # We found accept buttons but no reject buttons
            # Try one more time to find a way to close without accepting
            logger.warning(f"🍪 Found {len(found_accept_buttons)} accept buttons but no reject options - trying to close popup instead")

            # Try pressing Escape key
            await self.page.keyboard.press('Escape')
            await asyncio.sleep(1)
            if await self.is_content_visible():
                logger.info("🍪 Popup closed with Escape key - avoided accepting cookies")
                self._cookies_handled = True
                return True

            # Try clicking outside the popup
            await self.page.mouse.click(10, 10)  # Top-left corner
            await asyncio.sleep(1)
            if await self.is_content_visible():
                logger.info("🍪 Popup closed by clicking outside - avoided accepting cookies")
                self._cookies_handled = True
                return True

            # If we still can't close it, we have to accept or fail
            # Let's accept but log it prominently
            selector, element = found_accept_buttons[0]  # Click the first one
            await self.human_like_click(selector)
            await self.human_delay("between_clicks")
            logger.warning(f"🍪 FORCED TO ACCEPT cookies (no reject option available): {selector}")
            self._cookies_handled = True
            return True

        # Try visual cookie modal detection as fallback
        try:
            if await self.detect_cookie_modal_visual():
                logger.info("🍪 Cookie modal detected via visual analysis")
                # Try some generic close/dismiss actions
                generic_dismiss_selectors = [
                    "button[aria-label*='close']",
                    ".modal-close",
                    ".popup-close",
                    "[data-dismiss='modal']",
                    ".close-button"
                ]
                for selector in generic_dismiss_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element and await self.is_visible(element):
                            await self.human_like_click(selector)
                            # Mark that we've handled cookies for this page
                            self._cookies_handled = True
                            return True
                    except:
                        continue

                # Try OneTrust-specific overlay handling
                if await self.handle_onetrust_overlay():
                    logger.info("🍪 OneTrust overlay handled successfully")
                    self._cookies_handled = True
                    return True

        except Exception as e:
            logger.debug(f"Visual cookie detection failed: {str(e)}")

        logger.debug("🍪 No cookie popups found")
        return False

    async def load_page_safely(self, url: str) -> bool:
        """Enhanced page loading with better cookie handling"""

        try:
            # Reset cookie handling state for new page
            self._cookies_handled = False

            # Set viewport to ensure content is visible
            await self.page.set_viewport_size({"width": 1280, "height": 800})

            # Navigate to page
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await self.human_delay("page_load")

            # Initial cookie handling
            initial_handled = await self.handle_cookie_popups()
            if initial_handled:
                await self.human_delay("between_clicks")

            # Wait a bit for any delayed popups
            await asyncio.sleep(2)

            # Secondary cookie check - only if cookies weren't already handled
            if not self._cookies_handled:
                await self.handle_cookie_popups()

            # Check if content is visible with multiple strategies
            if await self.is_content_visible():
                logger.info("✅ Content is visible after cookie handling")
                return True
            else:
                logger.warning("⚠️ Content not immediately visible, trying aggressive approaches...")

                # Try scrolling to trigger content
                await self.page.evaluate("window.scrollTo(0, 300)")
                await asyncio.sleep(1)

                # Try aggressive cookie dismissal - only if not already handled
                if not self._cookies_handled and await self.force_cookie_dismissal():
                    return True

                # Final check - maybe the site is just slow
                await asyncio.sleep(3)
                return await self.is_content_visible()

        except Exception as e:
            logger.error(f"❌ Page load failed: {str(e)}")
            return False

    async def is_content_visible(self) -> bool:
        """More robust content detection that handles cookie overlays"""

        content_indicators = [
            # Property-specific content (not generic website elements)
            "h1", "h2",
            ".property-name", ".community-name", ".apartment-name",
            ".floor-plans", ".amenities", ".pricing",

            # Specific text patterns that indicate actual property content
            "//*[contains(text(), 'bedroom') or contains(text(), 'bath') or contains(text(), 'sq')]",
            "//*[contains(text(), 'apartment') or contains(text(), 'residence')]",
            "//*[contains(text(), 'rent') or contains(text(), 'lease')]",

            # Floor plan specific elements
            ".floorplan", ".unit-card", ".apartment-listing",

            # Avoid generic elements that might be in cookie popups
            "[class*='property']", "[class*='community']", "[class*='apartment']"
        ]

        for indicator in content_indicators:
            try:
                elements = await self.page.query_selector_all(indicator)
                for element in elements:
                    if await self.is_visible(element):
                        element_text = await element.evaluate("el => el.textContent")
                        # Verify it's actually property content, not cookie text
                        if self.is_property_content(element_text):
                            logger.info(f"✅ Found property content: {element_text[:50]}...")
                            return True
            except Exception as e:
                continue

        # Fallback: Check if we can see any substantial content (not just popup)
        main_content = await self.page.query_selector("main, .main, #main, .content, #content")
        if main_content and await self.is_visible(main_content):
            main_text = await main_content.evaluate("el => el.textContent")
            if len(main_text.strip()) > 100:  # Substantial content
                return True

        return False

    def is_property_content(self, text: str) -> bool:
        """Verify text is actually property-related, not cookie/privacy text"""
        if not text or len(text.strip()) < 10:
            return False

        property_keywords = [
            'apartment', 'bedroom', 'bathroom', 'sq', 'ft', 'rent',
            'lease', 'floor', 'plan', 'amenity', 'pool', 'fitness',
            'community', 'residence', 'unit', 'available'
        ]

        cookie_keywords = [
            'cookie', 'privacy', 'accept', 'agree', 'policy', 'consent',
            'gdpr', 'ccpa', 'tracking', 'personalize', 'experience'
        ]

        text_lower = text.lower()
        property_score = sum(1 for keyword in property_keywords if keyword in text_lower)
        cookie_score = sum(1 for keyword in cookie_keywords if keyword in text_lower)

        return property_score > cookie_score

    async def force_cookie_dismissal(self) -> bool:
        """More aggressive cookie dismissal strategies"""

        strategies = [
            # Strategy 1: Click every possible dismiss button
            self.click_all_dismiss_buttons(),

            # Strategy 2: Press Escape key
            self.press_escape(),

            # Strategy 3: Click outside modal (if overlay exists)
            self.click_outside_modal(),

            # Strategy 4: Use JavaScript to remove overlays
            self.remove_overlays_js(),

            # Strategy 5: Scroll to trigger lazy loading
            self.scroll_to_trigger_content(),
        ]

        for strategy in strategies:
            try:
                await strategy
                await asyncio.sleep(1)

                # Check if content is now visible
                if await self.is_content_visible():
                    logger.info("✅ Aggressive cookie dismissal worked!")
                    self._cookies_handled = True  # Mark cookies as handled
                    return True
            except Exception as e:
                continue

        return False

    async def click_all_dismiss_buttons(self):
        """Click every possible close/dismiss button - prioritize REJECT over accept"""
        # PRIORITY 1: Reject buttons
        reject_selectors = [
            "button:has-text('Reject All')", "button:has-text('Decline')",
            "button:has-text('Decline All')", "button:has-text('No Thanks')",
            "button:has-text('I Decline')", "button:has-text('Deny')",
            "button:has-text('Deny All')", "button:has-text('Refuse')",
            "button:has-text('Opt Out')", "button:has-text('Don't Accept')",
            "//button[contains(text(), 'Reject')]",
            "//button[contains(text(), 'Decline')]",
            "//button[contains(text(), 'Deny')]",
            "//button[contains(text(), 'No')]",
        ]

        for selector in reject_selectors:
            try:
                buttons = await self.page.query_selector_all(selector)
                for button in buttons:
                    if await self.is_visible(button):
                        await button.click()
                        logger.info(f"✅ Clicked REJECT button: {selector}")
                        await asyncio.sleep(0.5)
                        # Mark cookies as handled
                        self._cookies_handled = True
                        return  # Stop after clicking reject
            except:
                continue

        # PRIORITY 2: Close/Dismiss buttons
        close_selectors = [
            "button[aria-label*='close']", "button[class*='close']",
            ".close", ".dismiss", "[data-dismiss]", ".modal-close",
            "button:has-text('Close')", "button:has-text('X')",
            "button:has-text('×')",
            "//button[contains(text(), 'Close')]",
            "//button[contains(text(), '×')]",
            "//button[contains(text(), 'X')]",
        ]

        for selector in close_selectors:
            try:
                buttons = await self.page.query_selector_all(selector)
                for button in buttons:
                    if await self.is_visible(button):
                        await button.click()
                        logger.info(f"✅ Clicked CLOSE button: {selector}")
                        await asyncio.sleep(0.5)
                        # Mark cookies as handled
                        self._cookies_handled = True
                        return  # Stop after clicking close
            except:
                continue

        # PRIORITY 3: Accept buttons (only as last resort)
        accept_selectors = [
            "//button[contains(text(), 'Accept')]",
            "//button[contains(text(), 'Agree')]",
            "//button[contains(text(), 'OK')]",
            "//button[contains(text(), 'Continue')]",
        ]

        for selector in accept_selectors:
            try:
                buttons = await self.page.query_selector_all(selector)
                for button in buttons:
                    if await self.is_visible(button):
                        await button.click()
                        logger.warning(f"⚠️ Clicked ACCEPT button (reject preferred): {selector}")
                        await asyncio.sleep(0.5)
                        # Mark cookies as handled
                        self._cookies_handled = True
                        return  # Stop after clicking accept
            except:
                continue

    async def press_escape(self):
        """Press Escape key to dismiss popups"""
        await self.page.keyboard.press('Escape')
        await asyncio.sleep(0.5)

    async def click_outside_modal(self):
        """Click outside modal to dismiss it"""
        try:
            # Click in top-left corner (usually outside modal)
            await self.page.mouse.click(10, 10)
            await asyncio.sleep(0.5)
        except:
            pass

    async def remove_overlays_js(self):
        """Use JavaScript to remove cookie overlays"""
        remove_scripts = [
            # Remove common overlay elements
            "document.querySelectorAll('.cookie-banner, .popup-overlay, .modal-backdrop, [class*=\"overlay\"]').forEach(el => el.remove());",

            # Remove fixed/fixed-bottom elements that might be overlays
            "document.querySelectorAll('[style*=\"fixed\"], .fixed, .sticky').forEach(el => { if (el.offsetHeight < 200) el.remove(); });",

            # Enable scrolling if disabled
            "document.body.style.overflow = 'auto'; document.documentElement.style.overflow = 'auto';",

            # Remove blur effects
            "document.querySelectorAll('*').forEach(el => { el.style.filter = 'none'; });"
        ]

        for script in remove_scripts:
            try:
                await self.page.evaluate(script)
            except:
                pass

    async def scroll_to_trigger_content(self):
        """Scroll to trigger lazy loading and dismiss popups"""
        try:
            # Scroll down and back up
            await self.page.evaluate("window.scrollTo(0, 300)")
            await asyncio.sleep(1)
            await self.page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(1)
        except:
            pass

    async def debug_page_state(self, step_name: str):
        """Take screenshot for debugging when things go wrong"""
        try:
            import time
            screenshot_path = f"debug_{step_name}_{int(time.time())}.png"
            await self.page.screenshot(path=screenshot_path)
            logger.info(f"📸 Debug screenshot saved: {screenshot_path}")

            # Also log page HTML for analysis
            html_content = await self.page.content()
            html_path = f"debug_{step_name}_{int(time.time())}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            logger.info(f"📄 Debug HTML saved: {html_path}")
        except Exception as e:
            logger.error(f"Failed to save debug files: {str(e)}")

    async def extract_rental_data_with_debug(self, property_url: str, property_id: int = None) -> List[RentalData]:
        """Enhanced extraction with better debugging"""

        logger.info(f"🔍 Starting enhanced extraction for: {property_url}")

        # Try to load page safely
        if not await self.load_page_safely(property_url):
            logger.error("❌ Failed to load page safely, taking debug screenshot...")
            await self.debug_page_state("page_load_failed")
            return []

        # Take initial screenshot to see what we're working with
        await self.debug_page_state("after_page_load")

        # Continue with existing extraction flow
        return await self.extract_rental_data(property_url, property_id)

    async def handle_onetrust_overlay(self) -> bool:
        """Aggressively handle OneTrust cookie overlays that block interactions"""
        logger.info("🔒 Handling OneTrust overlay...")

        try:
            # Method 1: Try to find and click OneTrust accept button
            onetrust_buttons = [
                "#onetrust-accept-btn-handler",
                "#onetrust-pc-btn-handler",
                ".onetrust-close-btn-handler",
                "[data-testid='uc-accept-all-button']",
                ".ot-sdk-btn.ot-sdk-btn-primary"
            ]

            for button_selector in onetrust_buttons:
                try:
                    button = await self.page.query_selector(button_selector)
                    if button and await self.is_visible(button):
                        logger.info(f"🔒 Found OneTrust button: {button_selector}")
                        await self.human_like_click(button_selector)
                        await self.human_delay("page_navigation")
                        return True
                except:
                    continue

            # Method 2: Try to dismiss the overlay by clicking outside or using keyboard
            try:
                # Press Escape key
                await self.page.keyboard.press('Escape')
                await self.human_delay("between_clicks")
                if await self.is_content_visible():
                    logger.info("🔒 OneTrust overlay dismissed with Escape key")
                    return True
            except:
                pass

            # Method 3: Try to click on the overlay backdrop to dismiss
            try:
                overlay_selectors = [
                    ".onetrust-banner-container",
                    "#onetrust-banner-sdk",
                    ".onetrust-pc-dark-filter",
                    ".ot-sdk-container"
                ]

                for overlay in overlay_selectors:
                    try:
                        element = await self.page.query_selector(overlay)
                        if element:
                            # Click in the center of the overlay
                            box = await element.bounding_box()
                            if box:
                                await self.page.mouse.click(
                                    box['x'] + box['width'] / 2,
                                    box['y'] + box['height'] / 2
                                )
                                await self.human_delay("between_clicks")
                                if await self.is_content_visible():
                                    logger.info(f"🔒 OneTrust overlay dismissed by clicking {overlay}")
                                    return True
                    except:
                        continue
            except:
                pass

            # Method 4: Try to execute JavaScript to hide the overlay
            try:
                await self.page.evaluate("""
                    try {
                        // Remove OneTrust overlay completely
                        const onetrust = document.querySelector('#onetrust-consent-sdk');
                        if (onetrust) onetrust.remove();
                        
                        // Remove dark filter that's blocking clicks
                        const filters = document.querySelectorAll('.onetrust-pc-dark-filter, .ot-fade-in');
                        filters.forEach(f => f.remove());
                        
                        // Remove banner
                        const banners = document.querySelectorAll('#onetrust-banner-sdk, .onetrust-banner-container');
                        banners.forEach(b => b.remove());
                        
                        // Remove button group overlay
                        const buttonGroups = document.querySelectorAll('#onetrust-button-group');
                        buttonGroups.forEach(bg => bg.remove());
                        
                        // Remove any remaining overlays
                        const overlays = document.querySelectorAll('[data-nosnippet="true"]');
                        overlays.forEach(o => {
                            if (o.id.includes('onetrust') || o.className.includes('onetrust')) {
                                o.remove();
                            }
                        });
                        
                        // Force enable scrolling and interactions
                        document.body.style.overflow = 'auto';
                        document.documentElement.style.overflow = 'auto';
                        document.body.style.pointerEvents = 'auto';
                        
                        // Try to accept cookies programmatically
                        if (window.OneTrust && window.OneTrust.AcceptAll) {
                            window.OneTrust.AcceptAll();
                        }
                        if (window.Optanon && window.Optanon.AcceptAll) {
                            window.Optanon.AcceptAll();
                        }
                        
                        console.log('OneTrust overlay removal completed');
                        return true;
                    } catch (e) {
                        console.error('OneTrust removal failed:', e);
                        return false;
                    }
                """)
                await self.human_delay("page_navigation")
                if await self.is_content_visible():
                    logger.info("🔒 OneTrust overlay hidden with JavaScript")
                    return True
            except Exception as e:
                logger.debug(f"JavaScript overlay removal failed: {str(e)}")

        except Exception as e:
            logger.error(f"🔒 OneTrust overlay handling failed: {str(e)}")

        return False

    async def smart_navigation(self, target_selector: str) -> bool:
        """Navigate with cookie popup awareness"""
        logger.info(f"🧠 Smart navigation to: {target_selector}")

        # First, check for and dismiss cookie popups
        cookie_handled = await self.handle_cookie_popups()
        if cookie_handled:
            await self.human_delay("page_navigation")

        # Now attempt the actual navigation
        try:
            await self.human_like_click(target_selector)
            await self.human_delay("page_navigation")

            # Check for cookies again after navigation
            cookie_handled_2 = await self.handle_cookie_popups()
            if cookie_handled_2:
                await self.human_delay("page_navigation")

            return True

        except Exception as e:
            logger.error(f"Smart navigation failed: {str(e)}")
            return False

    async def robust_element_click(self, selector: str, max_retries: int = 3) -> bool:
        """Click element with cookie interference retry logic"""
        logger.info(f"🎯 Robust click attempt on: {selector}")

        for attempt in range(max_retries):
            try:
                # Check for cookies before each click
                await self.handle_cookie_popups()

                element = await self.page.query_selector(selector)
                if element and await self.is_visible(element):
                    await self.human_like_click(selector)
                    logger.info(f"✅ Robust click successful on attempt {attempt + 1}")
                    return True
                else:
                    logger.debug(f"Element not found/visible: {selector}")

            except Exception as e:
                logger.warning(f"Click attempt {attempt + 1} failed: {str(e)}")
                await self.human_delay("between_clicks")

        logger.error(f"❌ All {max_retries} robust click attempts failed")
        return False

    async def extract_12_month_rates(self, property_url: str) -> Dict[str, Any]:
        """Complete flow: Property → Floor Plans → Available Unit → Lease Now → 12-month Rate (Cookie-Safe)"""
        logger.info(f"🍪 Starting cookie-safe enhanced lease flow extraction for: {property_url}")

        try:
            # Check if we're already on the correct page (avoid reloading)
            current_url = self.page.url if self.page else ""
            if not current_url or property_url not in current_url:
                # Step 0: Load page safely with cookie handling
                page_loaded = await self.load_page_safely(property_url)
                if not page_loaded:
                    return {"error": "Could not load page safely (cookies/content blocked)", "success": False}
            else:
                logger.info("🍪 Already on correct page, skipping reload")

            await self.simulate_reading_behavior()

            # Step 1: Navigate using site-specific flow for complex websites
            if "thecollectiveuws.com" in property_url:
                logger.info("🏢 Using multi-step floor plan navigation for The Collective UWS")
                # Use the new multi-step navigation for complex sites
                rental_data = await self.navigate_floor_plan_flow(property_url)
                if not rental_data:
                    return {"error": "Multi-step floor plan navigation failed for The Collective UWS", "success": False}

                # Extract the best pricing from the rental data
                monthly_rate = self._extract_best_monthly_rate(rental_data)
                return {
                    "success": True,
                    "rental_data": rental_data,
                    "12_month_rate": monthly_rate,
                    "extraction_method": "multi_step_floor_plan"
                }
            else:
                # Use standard navigation for other sites
                floor_plans_success = await self.navigate_to_floor_plans_cookie_safe()
                if not floor_plans_success:
                    return {"error": "Could not navigate to floor plans (cookie interference)", "success": False}

            # Step 2: Find and click an available unit (cookie-aware)
            available_unit = await self.find_available_unit()
            if not available_unit:
                return {"error": "No available units found", "success": False}

            click_success = await self.smart_navigation(available_unit)
            if not click_success:
                return {"error": "Could not click available unit (cookie interference)", "success": False}

            if self.stealth_mode:
                await self.human_delay("page_navigation")
                await self.simulate_reading_behavior()

            # Step 3: Click "Lease Now" or "Rent Now" (cookie-aware)
            lease_button = await self.find_lease_button()
            if not lease_button:
                return {"error": "Lease now button not found", "success": False}

            click_success_2 = await self.smart_navigation(lease_button)
            if not click_success_2:
                return {"error": "Could not click lease button (cookie interference)", "success": False}

            if self.stealth_mode:
                await self.human_delay("page_navigation")
                await self.simulate_reading_behavior()

            # Step 4: Extract 12-month leasing rate
            monthly_rate = await self.extract_12_month_rate()

            return {
                "success": True,
                "available_unit": "Found and clicked (cookie-safe)",
                "12_month_rate": monthly_rate,
                "extraction_method": "full_lease_flow_cookie_safe"
            }

        except Exception as e:
            logger.error(f"🍪 Cookie-safe lease flow extraction failed: {str(e)}")
            return {"error": f"Cookie-safe lease flow failed: {str(e)}", "success": False}

    async def navigate_to_floor_plans_cookie_safe(self) -> bool:
        """Enhanced navigation to floor plans with cookie protection"""
        logger.info("🍪 Navigating to floor plans (cookie-safe)...")

        # Strategy 1: Use existing common navigation with cookie checks
        nav_success = await self._try_common_navigation_cookie_safe()
        if nav_success:
            return True

        # Strategy 2: Vision-guided navigation with cookie awareness
        vision_success = await self._try_vision_navigation_cookie_safe()
        if vision_success:
            return True

        # Strategy 3: Direct URL manipulation (if we can detect floor plans URL)
        current_url = self.page.url
        floor_plan_urls = [
            current_url + "/floor-plans",
            current_url + "/floorplans",
            current_url + "/units",
            current_url + "/apartments"
        ]

        for url in floor_plan_urls:
            try:
                if self.stealth_mode:
                    await self.human_like_page_load(url)
                else:
                    await self.page.goto(url, wait_until='networkidle', timeout=self.page_timeout)
                    await asyncio.sleep(3)

                # Handle any cookies that appeared after navigation
                await self.handle_cookie_popups()
                await self.human_delay("page_navigation")

                return True
            except:
                continue

        return False

    async def _try_common_navigation_cookie_safe(self) -> bool:
        """Try common navigation patterns with cookie protection"""
        logger.info("🍪 Trying common navigation patterns (cookie-safe)...")

        common_selectors = [
            "a[href*='floor-plan']",
            "a[href*='floorplans']",
            "a[href*='units']",
            "a[href*='apartments']",
            "text=Floor Plans",
            "text=Floorplans",
            "text=Units",
            "text=Apartments"
        ]

        for selector in common_selectors:
            try:
                element = await self.page.query_selector(selector)
                if element and await self.is_visible(element):
                    logger.info(f"🍪 Found floor plans link: {selector}")
                    # Use smart navigation with cookie handling
                    success = await self.smart_navigation(selector)
                    if success:
                        await self.simulate_reading_behavior()
                        return True
            except Exception as e:
                logger.debug(f"Common navigation selector {selector} failed: {str(e)}")
                continue

        return False

    async def _try_vision_navigation_cookie_safe(self) -> bool:
        """Vision-guided navigation with cookie awareness"""
        logger.info("🍪 Trying vision-guided navigation (cookie-safe)...")

        try:
            screenshot = await self.page.screenshot()

            analysis_prompt = """
            Look at this apartment website screenshot. Find clickable elements that lead to floor plans, units, or apartment listings.
            Look for:
            - "Floor Plans" links or buttons
            - "Units" or "Apartments" navigation
            - "Available Rentals" sections
            - Any menu items that would show apartment listings

            Return the CSS selector or text content of the most likely element to click to see floor plans.
            If you see a cookie popup blocking content, ignore it and focus on the actual navigation elements.

            Return format: Just the selector like "text=Floor Plans" or "a[href*='floor-plans']"
            """

            response = await self._vision_extract_pricing_single(screenshot, analysis_prompt)
            if response and isinstance(response, str) and len(response.strip()) > 0:
                suggested_selector = response.strip()
                logger.info(f"🍪 Vision suggested selector: {suggested_selector}")

                # Try the suggested selector with robust clicking
                success = await self.robust_element_click(suggested_selector)
                if success:
                    await self.handle_cookie_popups()  # Handle any post-click cookies
                    await self.simulate_reading_behavior()
                    return True

        except Exception as e:
            logger.error(f"🍪 Vision-guided navigation failed: {str(e)}")

        return False

    async def _navigate_collective_flow(self) -> bool:
        """Navigate The Collective UWS specific flow: Floor Plans → Availability → Lease Now"""
        logger.info("🏢 Navigating The Collective UWS flow: Floor Plans → Availability → Lease Now")

        try:
            # Step 1: Click "Floor Plans" or "Apartments"
            floor_plans_selectors = [
                "text=Floor Plans",
                "text=Apartments",
                "a[href*='floor-plan']",
                "a[href*='apartments']",
                "[data-section='floor-plans']",
                ".floor-plans-link"
            ]

            floor_plans_clicked = False
            for selector in floor_plans_selectors:
                if await self.robust_element_click(selector, max_retries=2):
                    logger.info(f"🏢 Clicked Floor Plans: {selector}")
                    floor_plans_clicked = True
                    await self.human_delay("page_navigation")
                    await self.simulate_reading_behavior()
                    break

            if not floor_plans_clicked:
                logger.warning("🏢 Could not find Floor Plans link")
                return False

            # Step 2: Look for "Availability" or "Check Availability"
            availability_selectors = [
                "text=Availability",
                "text=Check Availability",
                "text=View Availability",
                "button[data-action='availability']",
                ".availability-button",
                "[href*='availability']"
            ]

            availability_clicked = False
            for selector in availability_selectors:
                if await self.robust_element_click(selector, max_retries=2):
                    logger.info(f"🏢 Clicked Availability: {selector}")
                    availability_clicked = True
                    await self.human_delay("page_navigation")
                    await self.simulate_reading_behavior()
                    break

            if not availability_clicked:
                logger.warning("🏢 Could not find Availability button, continuing to Lease Now...")

            # Step 3: Click "Lease Now" or similar
            lease_selectors = [
                "text=Lease Now",
                "text=Rent Now",
                "text=Apply Now",
                "button[data-action='lease']",
                ".lease-button",
                "[href*='lease']"
            ]

            lease_clicked = False
            for selector in lease_selectors:
                if await self.robust_element_click(selector, max_retries=2):
                    logger.info(f"🏢 Clicked Lease Now: {selector}")
                    lease_clicked = True
                    await self.human_delay("page_navigation")
                    await self.simulate_reading_behavior()
                    break

            if not lease_clicked:
                logger.error("🏢 Could not find Lease Now button")
                return False

            logger.info("🏢 Successfully completed The Collective UWS flow")
            return True

        except Exception as e:
            logger.error(f"🏢 The Collective UWS flow failed: {str(e)}")
            return False

    async def find_available_unit(self) -> Optional[str]:
        """Find and return selector for an available unit using comprehensive strategies"""

        # Strategy 1: Look for "Available" badges/text
        available_indicators = [
            "//*[contains(text(), 'Available')]",
            "//*[contains(text(), 'Available Now')]",
            "//*[contains(text(), 'Apply Now')]",
            ".available-unit",
            "[data-status='available']",
            ".unit-available"
        ]

        for indicator in available_indicators:
            try:
                element = await self.page.query_selector(indicator)
                if element:
                    # Get the parent unit card or clickable element
                    unit_selector = await self.find_clickable_parent_selector(element)
                    if unit_selector:
                        return unit_selector
            except:
                continue

        # Strategy 2: Look for unit listings and check availability
        unit_selectors = [
            ".unit-card",
            ".floorplan-item",
            ".available-unit",
            "[data-unit]",
            ".apartment-unit"
        ]

        for selector in unit_selectors:
            try:
                units = await self.page.query_selector_all(selector)
                for i, unit in enumerate(units[:3]):  # Check first 3 units
                    unit_text = await self.page.evaluate("el => el.textContent", unit)
                    if any(term in unit_text.lower() for term in ['available', 'apply', 'lease now', 'rent now']):
                        return f"{selector}:nth-of-type({i+1})"
            except:
                continue

        return None

    async def find_lease_button(self) -> Optional[str]:
        """Find Lease Now/Rent Now button using multiple strategies and return selector"""

        lease_button_texts = [
            "Lease Now", "Rent Now", "Apply Now", "Check Availability",
            "Schedule Tour", "Reserve Now", "Get Pricing", "See Pricing"
        ]

        # Try exact text matches first
        for button_text in lease_button_texts:
            try:
                # Use XPath to find button by text content
                xpath = f"//*[text()='{button_text}']"
                element = await self.page.query_selector(f"xpath={xpath}")
                if element and await self.is_visible(element):
                    return f"xpath={xpath}"
            except:
                continue

        # Try case-insensitive and partial matches
        for button_text in lease_button_texts:
            try:
                xpath = f"//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{button_text.lower()}')]"
                elements = await self.page.query_selector_all(f"xpath={xpath}")
                for element in elements:
                    if await self.is_visible(element):
                        return f"xpath={xpath}"
            except:
                continue

        return None

    async def extract_12_month_rate(self) -> Optional[float]:
        """Extract the 12-month lease rate from pricing page"""

        try:
            # Take screenshot for GPT-4o analysis
            screenshot = await self.page.screenshot()

            analysis_prompt = """
            You are on the final pricing page of an apartment leasing flow.
            Find the 12-month lease rate specifically.

            Look for:
            - "12 Month" lease term with associated price
            - Lease term dropdowns with 12 months selected
            - Pricing tables showing 12-month rates
            - "1 Bed/1 Bath" or similar with 12-month pricing
            - Monthly rent for 12-month commitment

            Return ONLY the monthly rent number for 12 months, or null if not found.
            Format: Just the number, like "1850.00" or "null"
            """

            monthly_rate = await self._vision_extract_pricing_single(screenshot, analysis_prompt)
            return monthly_rate

        except Exception as e:
            logger.error(f"12-month rate extraction failed: {str(e)}")
            return None

    async def extract_optimal_lease_rate(self, property_url: str) -> Dict[str, Any]:
        """Extract best available lease term when 12-month isn't available"""

        try:
            # Navigate to pricing page first
            await self.navigate_to_pricing_page(property_url)

            # Extract ALL available lease terms
            lease_terms = await self.extract_all_lease_terms()

            if not lease_terms:
                return {"error": "No lease terms found", "success": False}

            # Find optimal lease term
            optimal_term = self.select_optimal_lease_term(lease_terms)

            # Extract additional fees and total monthly payment
            fees = await self.extract_additional_fees()
            total_monthly = await self.extract_total_monthly_payment()

            return {
                "success": True,
                "available_lease_terms": lease_terms,
                "selected_lease_term": optimal_term,
                "additional_fees": fees,
                "total_monthly_payment": total_monthly,
                "selection_reason": optimal_term.get("selection_reason", "") if optimal_term else ""
            }

        except Exception as e:
            logger.error(f"Optimal lease rate extraction failed: {str(e)}")
            return {"error": f"Lease extraction failed: {str(e)}", "success": False}

    async def navigate_to_pricing_page(self, property_url: str) -> bool:
        """Navigate through the full flow to reach pricing page"""
        result = await self.extract_12_month_rates(property_url)
        return result.get("success", False)

    async def extract_all_lease_terms(self) -> List[Dict]:
        """Extract ALL available lease terms and prices"""

        try:
            # Take screenshot for comprehensive analysis
            screenshot = await self.page.screenshot()

            analysis_prompt = """
            You are on an apartment leasing pricing page. Extract ALL available lease terms and their monthly prices.

            CRITICAL: Capture EVERY lease term option shown, including:
            - Lease duration (6 months, 12 months, 15 months, 18 months, etc.)
            - Monthly price for each term
            - Any asterisks or notes about pricing

            Also capture:
            - Additional monthly services/fees (parking, trash, technology fees, etc.)
            - Total monthly payment amount
            - Move-in date if shown

            Return JSON format:
            {
                "lease_terms": [
                    {"months": 12, "monthly_price": 1850.00, "notes": "price subject to change"},
                    {"months": 18, "monthly_price": 1750.00, "notes": "price subject to change"}
                ],
                "additional_fees": [
                    {"name": "Parking", "amount": 30.00},
                    {"name": "Technology Fee", "amount": 65.00}
                ],
                "total_monthly_payment": 1945.00,
                "move_in_date": "October 08, 2025"
            }
            """

            response = await self._vision_extract_pricing_single(screenshot, analysis_prompt)
            if response and isinstance(response, dict):
                return response.get("lease_terms", [])
            else:
                # Fallback to HTML parsing
                return await self.extract_lease_terms_html_fallback()

        except Exception as e:
            logger.error(f"Lease terms extraction failed: {str(e)}")
            return await self.extract_lease_terms_html_fallback()

    def select_optimal_lease_term(self, lease_terms_data: List[Dict]) -> Optional[Dict]:
        """Intelligently select the best available lease term"""

        if not lease_terms_data:
            return None

        # Strategy 1: Find exact 12-month lease
        twelve_month = next((term for term in lease_terms_data if term.get("months") == 12), None)
        if twelve_month:
            twelve_month["selection_reason"] = "Exact 12-month term available"
            return twelve_month

        # Strategy 2: Find closest alternative to 12 months
        optimal_term = self.find_closest_lease_term(lease_terms_data, target_months=12)

        # Strategy 3: If no close terms, find cheapest per month
        if not optimal_term:
            optimal_term = min(lease_terms_data, key=lambda x: x.get("monthly_price", float('inf')))
            optimal_term["selection_reason"] = "Cheapest available option (no close term to 12 months)"
        else:
            optimal_term["selection_reason"] = f"Closest to 12 months (available: {optimal_term['months']} months)"

        return optimal_term

    def find_closest_lease_term(self, lease_terms: List[Dict], target_months: int = 12) -> Optional[Dict]:
        """Find lease term closest to target duration"""
        if not lease_terms:
            return None

        # Filter reasonable terms (3-24 months typically)
        reasonable_terms = [term for term in lease_terms if 3 <= term.get("months", 0) <= 24]
        if not reasonable_terms:
            return None

        # Find term with minimum absolute difference from target
        closest_term = min(
            reasonable_terms,
            key=lambda term: abs(term.get("months", 0) - target_months)
        )

        # Only return if reasonably close (within 6 months)
        if abs(closest_term.get("months", 0) - target_months) <= 6:
            return closest_term

        return None

    async def extract_lease_terms_html_fallback(self) -> List[Dict]:
        """Fallback method to extract lease terms from HTML"""

        lease_terms = []

        try:
            # Strategy 1: Look for lease term dropdown options
            dropdown_selectors = [
                "select[name*='lease']",
                "select[id*='lease']",
                ".lease-term-select",
                "[data-lease-terms]"
            ]

            for selector in dropdown_selectors:
                dropdown = await self.page.query_selector(selector)
                if dropdown:
                    options = await dropdown.query_selector_all("option")
                    for option in options:
                        option_text = await option.evaluate("el => el.textContent")
                        price_match = re.search(r'(\d+)\s*months?\s*[\$]?(\d+[,.]?\d*)', option_text)
                        if price_match:
                            months = int(price_match.group(1))
                            price = float(price_match.group(2).replace(',', ''))
                            lease_terms.append({"months": months, "monthly_price": price})

            # Strategy 2: Look for lease term tables/lists
            table_selectors = [
                ".lease-terms",
                ".pricing-table",
                "[data-testid*='lease']",
                "//*[contains(text(), 'Lease Terms')]/following-sibling::div"
            ]

            for selector in table_selectors:
                elements = await self.page.query_selector_all(selector)
                for element in elements:
                    text = await element.evaluate("el => el.textContent")
                    # Look for patterns like "12 months $1,850"
                    matches = re.findall(r'(\d+)\s*months?\s*[\$]?(\d+[,.]?\d*)', text)
                    for months, price in matches:
                        lease_terms.append({
                            "months": int(months),
                            "monthly_price": float(price.replace(',', ''))
                        })

        except Exception as e:
            logger.error(f"HTML fallback extraction failed: {str(e)}")

        return lease_terms

    async def extract_additional_fees(self) -> List[Dict]:
        """Extract additional monthly fees and services"""

        try:
            screenshot = await self.page.screenshot()

            analysis_prompt = """
            Extract all additional monthly fees and services from this apartment pricing page.
            Look for:
            - Parking fees (reserved, covered, garage)
            - Technology/internet fees
            - Trash/recycling fees
            - Pest control fees
            - Pet fees (monthly)
            - Storage fees
            - Any other recurring monthly charges

            Return as JSON list:
            {
                "additional_fees": [
                    {"name": "Parking", "amount": 50.00},
                    {"name": "Internet", "amount": 75.00}
                ]
            }
            """

            response = await self._vision_extract_pricing_single(screenshot, analysis_prompt)
            if response and isinstance(response, dict):
                return response.get("additional_fees", [])
            return []

        except Exception as e:
            logger.error(f"Additional fees extraction failed: {str(e)}")
            return []

    async def extract_total_monthly_payment(self) -> Optional[float]:
        """Extract the total monthly payment amount"""

        try:
            # Look for total payment indicators
            total_selectors = [
                "//*[contains(text(), 'Total Monthly')]",
                "//*[contains(text(), 'Monthly Payment')]",
                "//*[contains(text(), 'Total Payment')]",
                ".total-payment",
                ".monthly-total"
            ]

            for selector in total_selectors:
                element = await self.page.query_selector(selector)
                if element:
                    text = await element.evaluate("el => el.textContent")
                    # Extract dollar amount
                    money_match = re.search(r'[\$]?(\d+[,.]?\d*\.?\d+)', text)
                    if money_match:
                        return float(money_match.group(1).replace(',', ''))

            return None

        except Exception as e:
            logger.error(f"Total monthly payment extraction failed: {str(e)}")
            return None

    async def find_clickable_parent_selector(self, element) -> Optional[str]:
        """Find the parent clickable element selector (unit card, button, etc.)"""
        try:
            parent = element
            for i in range(5):  # Check up to 5 parents up
                parent = await parent.query_selector("xpath=..")
                if not parent:
                    break

                # Check if parent is clickable (button, link, or has click handler)
                tag_name = await parent.evaluate("el => el.tagName.toLowerCase()")
                if tag_name in ['a', 'button', 'div', 'li']:
                    onclick = await parent.evaluate("el => el.onclick")
                    if onclick or tag_name in ['a', 'button']:
                        # Create a unique selector for this element
                        class_attr = await parent.evaluate("el => el.className")
                        id_attr = await parent.evaluate("el => el.id")
                        if id_attr:
                            return f"#{id_attr}"
                        elif class_attr:
                            # Use the first class as selector
                            first_class = class_attr.split()[0]
                            return f".{first_class}"
                        else:
                            # Fallback to tag name with index
                            return tag_name

            return None  # Return None if no better parent found

        except Exception as e:
            logger.error(f"Clickable parent selector search failed: {str(e)}")
            return None

    async def is_visible(self, element) -> bool:
        """Check if element is visible on page"""
        try:
            return await element.is_visible()
        except:
            return False

    async def _vision_extract_pricing_single(self, screenshot: bytes, prompt: str) -> Any:
        """Extract pricing information using vision analysis with custom prompt"""
        try:
            # Convert screenshot to base64
            base64_image = base64.b64encode(screenshot).decode('utf-8')

            # Use OpenAI GPT-4o
            import openai
            client = openai.OpenAI(api_key=self.openai_api_key)

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.1
            )

            result_text = response.choices[0].message.content.strip()
            logger.info(f"Vision analysis result: {result_text[:200]}...")

            # Try to parse as JSON first
            try:
                return json.loads(result_text)
            except json.JSONDecodeError:
                # Try to extract number if it's a simple response
                money_match = re.search(r'[\$]?(\d+[,.]?\d*\.?\d+)', result_text)
                if money_match:
                    return float(money_match.group(1).replace(',', ''))
                return result_text

        except Exception as e:
            logger.error(f"Vision pricing extraction failed: {str(e)}")
            return None

    async def extract_rental_data(self, property_url: str, property_id: int = None) -> List[RentalData]:
        """
        Main method to extract rental data from a property website

        Args:
            property_url: URL of the apartment property website
            property_id: ID from properties_basic table (optional)

        Returns:
            List of RentalData objects with pricing information
        """
        logger.info(f"Starting rental data extraction for: {property_url}")

        if not self.page:
            raise RuntimeError("Browser not initialized. Use async context manager.")

        try:
            # Use cookie-safe page loading
            page_loaded = await self.load_page_safely(property_url)
            if not page_loaded:
                logger.error(f"❌ Could not load page safely: {property_url}")
                return []

            rental_data = []

            # ===== ENHANCED LEASE FLOW INTEGRATION =====

            # Try enhanced lease flow extraction first (for complete pricing)
            lease_flow_result = await self.extract_12_month_rates(property_url)
            if lease_flow_result.get("success"):
                logger.info("Enhanced lease flow extraction successful")
                # Create rental data from lease flow result
                rental_info = RentalData(
                    floorplan_name="Lease Flow Extracted",
                    bedrooms=1,  # Default, will be updated if more specific data available
                    bathrooms=1.0,
                    sqft=None,
                    monthly_rent=lease_flow_result.get("12_month_rate", 0.0),
                    lease_term_months=12,
                    lease_term="12 months",  # Descriptive lease term
                    concessions=None,
                    availability_date=None,
                    availability_status='available',
                    confidence_score=0.9,  # High confidence for full flow extraction
                    data_source='lease_flow_agent',
                    raw_data={
                        "lease_flow_extracted": True,
                        "extraction_method": "full_lease_flow",
                        "available_unit": lease_flow_result.get("available_unit"),
                        "12_month_rate": lease_flow_result.get("12_month_rate")
                    }
                )
                rental_data.append(rental_info)
                logger.info(f"Successfully extracted 1 rental record via lease flow")
                return rental_data
            else:
                logger.info("Lease flow extraction failed, falling back to standard extraction")

                # Fallback: Try optimal lease term extraction
                optimal_lease = await self.extract_optimal_lease_rate(property_url)
                if optimal_lease.get("success"):
                    selected_term = optimal_lease.get("selected_lease_term", {})
                    rental_info = RentalData(
                        floorplan_name="Optimal Lease Term",
                        bedrooms=1,
                        bathrooms=1.0,
                        sqft=None,
                        monthly_rent=selected_term.get("monthly_price", 0.0),
                        lease_term_months=selected_term.get("months", 12),
                        lease_term=f"{selected_term.get('months', 12)} months",  # Descriptive lease term
                        concessions=None,
                        availability_date=None,
                        availability_status='available',
                        confidence_score=0.8,
                        data_source='optimal_lease_agent',
                        raw_data={
                            "optimal_lease_term": selected_term,
                            "all_lease_terms": optimal_lease.get("available_lease_terms", []),
                            "additional_fees": optimal_lease.get("additional_fees", []),
                            "total_monthly_payment": optimal_lease.get("total_monthly_payment"),
                            "selection_reason": selected_term.get("selection_reason", "")
                        }
                    )
                    rental_data.append(rental_info)
                    logger.info(f"Successfully extracted 1 rental record via optimal lease term")
                    return rental_data

            # ===== STANDARD EXTRACTION (if lease flow didn't work) =====

            # Step 1: Extract concessions from main page
            concessions = await self._extract_concessions()
            if not concessions and "thecollectiveuws.com" in property_url:
                # Try site-specific extraction for The Collective UWS
                concessions = await self._extract_concessions_site_specific(property_url)
            logger.info(f"Found concessions: {concessions}")

            # Step 2: Site-specific navigation (for known problematic sites)
            site_nav_success = await self._site_specific_navigation(property_url)
            if site_nav_success:
                logger.info("Site-specific navigation successful")

            # Step 3: Pre-navigation - try to access pricing/floor plans content
            await self._pre_navigate_to_content()

            # Step 4: Navigate to floor plans/pricing section if needed
            await self._navigate_to_floor_plans()

            # Step 5: Extract available units and pricing
            units_data = await self._extract_unit_pricing()
            logger.info(f"Extracted {len(units_data)} unit configurations")

            # Step 6: Navigate to application/pricing page if needed
            if not units_data:
                await self._navigate_to_pricing_page()
                units_data = await self._extract_unit_pricing()

            # Step 7: Process and structure the data
            for unit in units_data:
                rental_info = RentalData(
                    floorplan_name=unit.get('floorplan_name', 'Unknown'),
                    bedrooms=unit.get('bedrooms', 0),
                    bathrooms=unit.get('bathrooms', 1.0),
                    sqft=unit.get('sqft'),
                    monthly_rent=unit.get('monthly_rent', 0.0),
                    lease_term_months=unit.get('lease_term_months', 12),
                    lease_term=unit.get('lease_term') or f"{unit.get('lease_term_months', 12)} months",  # Descriptive lease term
                    concessions=concessions or unit.get('concessions'),
                    availability_date=unit.get('availability_date'),
                    availability_status=unit.get('availability_status', 'available'),
                    confidence_score=unit.get('confidence_score', 0.5),
                    data_source='vision_agent',
                    raw_data=unit
                )
                rental_data.append(rental_info)

            # ===== MULTI-STEP NAVIGATION FALLBACK =====
            # If standard extraction found very limited data (< 3 units), try multi-step navigation
            if len(rental_data) < 3 and self._is_complex_site(property_url):
                logger.info(f"Limited data found ({len(rental_data)} units), trying multi-step navigation")
                multi_step_data = await self.navigate_floor_plan_flow(property_url)
                if multi_step_data:
                    # Convert multi-step data to RentalData objects
                    for item in multi_step_data:
                        rental_info = RentalData(
                            floorplan_name=item.get('unit_type', 'Multi-Step Extracted'),
                            bedrooms=1,  # Default, could be enhanced with vision
                            bathrooms=1.0,
                            sqft=None,
                            monthly_rent=item.get('monthly_rent', 0.0),
                            lease_term_months=item.get('lease_term_months', 12),
                            lease_term=item.get('lease_term') or f"{item.get('lease_term_months', 12)} months",  # Descriptive lease term
                            concessions=item.get('special_pricing'),
                            availability_date=item.get('available_date'),
                            availability_status='available',
                            confidence_score=0.8,
                            data_source='multi_step_agent',
                            raw_data=item
                        )
                        rental_data.append(rental_info)
                    logger.info(f"Multi-step navigation added {len(multi_step_data)} additional records")

            logger.info(f"Successfully extracted {len(rental_data)} rental records")
            return rental_data

        except Exception as e:
            logger.error(f"Error extracting rental data from {property_url}: {str(e)}")
            return []

    async def _extract_concessions(self) -> Optional[str]:
        """Extract concession information from the current page"""
        try:
            # Take screenshot for vision analysis (full page)
            screenshot = await self.page.screenshot(full_page=True)

            # Use vision model to find concessions
            concessions = await self._vision_find_concessions(screenshot)
            return concessions

        except Exception as e:
            logger.error(f"Error extracting concessions: {str(e)}")
            return None

    async def _extract_concessions_site_specific(self, site_url: str) -> Optional[str]:
        """Site-specific concession extraction for known websites"""
        try:
            if "thecollectiveuws.com" in site_url:
                # For The Collective UWS, concessions are labeled as "Leasing Specials" on homepage
                leasing_specials_selectors = [
                    "//*[contains(text(), 'Leasing Specials')]/following-sibling::*",
                    "//*[contains(text(), 'Leasing Specials')]/..",
                    ".leasing-specials",
                    "[data-section*='specials']",
                    ".specials-section"
                ]

                for selector in leasing_specials_selectors:
                    try:
                        element = await self.page.query_selector(selector)
                        if element:
                            text = await element.evaluate("el => el.textContent")
                            if text and len(text.strip()) > 10:  # Has meaningful content
                                logger.info(f"Found Leasing Specials content: {text[:100]}...")
                                return text.strip()
                    except:
                        continue

                # Fallback: Look for any element containing "special" or "leasing"
                fallback_selectors = [
                    "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'leasing special')]",
                    "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'special offer')]"
                ]

                for selector in fallback_selectors:
                    try:
                        elements = await self.page.query_selector_all(f"xpath={selector}")
                        for element in elements:
                            text = await element.evaluate("el => el.textContent")
                            if text and len(text.strip()) > 10:
                                return text.strip()
                    except:
                        continue

        except Exception as e:
            logger.error(f"Site-specific concession extraction failed: {str(e)}")

        return None

    async def _pre_navigate_to_content(self) -> bool:
        """Pre-navigation: Try to access pricing/floor plans content before extraction"""
        try:
            logger.info("Starting pre-navigation to access pricing content...")

            # Strategy 1: Try common navigation patterns
            nav_success = await self._try_common_navigation()
            if nav_success:
                logger.info("Pre-navigation successful with common patterns")
                return True

            # Strategy 2: Vision-guided navigation for complex sites
            vision_success = await self._try_vision_navigation()
            if vision_success:
                logger.info("Pre-navigation successful with vision guidance")
                return True

            # Strategy 3: Scroll and wait for dynamic content
            await self._scroll_and_wait()
            logger.info("Pre-navigation completed with scrolling strategy")
            return True

        except Exception as e:
            logger.error(f"Error in pre-navigation: {str(e)}")
            return False

    async def _try_common_navigation(self) -> bool:
        """Try common navigation patterns to access pricing content"""
        common_patterns = [
            # Direct links
            'a[href*="floor-plan"]', 'a[href*="floorplan"]', 'a[href*="pricing"]',
            'a[href*="rent"]', 'a[href*="rates"]', 'a[href*="units"]',

            # Button text matches
            'button:has-text("Floor Plans")', 'a:has-text("Floor Plans")',
            'button:has-text("Pricing")', 'a:has-text("Pricing")',
            'button:has-text("Units")', 'a:has-text("Units")',
            'button:has-text("Rentals")', 'a:has-text("Rentals")',

            # Common class/ID patterns
            '.floor-plans', '#floor-plans', '.pricing', '#pricing',
            '.units', '#units', '.rentals', '#rentals',

            # Navigation menu items
            'nav a[href*="floor"]', 'nav a[href*="pricing"]', 'nav a[href*="rent"]',

            # Tab/navigation elements
            '[role="tab"]:has-text("Floor Plans")', '[role="tab"]:has-text("Pricing")',
            '.tab:has-text("Floor Plans")', '.tab:has-text("Pricing")'
        ]

        for pattern in common_patterns:
            try:
                # Check if element exists first
                element_count = await self.page.locator(pattern).count()
                if element_count > 0:
                    logger.info(f"Found {element_count} elements matching: {pattern}")
                    # Click the first matching element
                    await self.page.locator(pattern).first.click(timeout=2000)
                    await asyncio.sleep(3)  # Wait for content to load
                    return True
            except Exception as e:
                # Continue to next pattern
                continue

        return False

    async def _try_vision_navigation(self) -> bool:
        """Use vision AI to find and click navigation elements"""
        try:
            screenshot = await self.page.screenshot(full_page=True)

            # Ask vision model to identify clickable elements for pricing/floor plans
            prompt = """
            Look for buttons, links, or tabs that would lead to floor plans, pricing, or rental units.
            Common labels include: "Floor Plans", "Pricing", "Units", "Rentals", "Availability".

            Return ONLY a valid CSS selector for the most prominent navigation element.
            Examples: 'a[href*="floor-plans"]', 'button.floor-plans-btn', '.nav-pricing'

            If you find a clear navigation element, return its CSS selector.
            If no clear navigation element is visible, return 'none'.
            """

            result = await self._vision_analyze_image(screenshot, prompt)

            if result and result.lower().strip() not in ['none', 'no', 'n/a', '']:
                # Clean and try the selector
                selector = result.strip('`"\'')
                try:
                    await self.page.click(selector, timeout=3000)
                    await asyncio.sleep(3)
                    logger.info(f"Vision-guided navigation successful with selector: {selector}")
                    return True
                except Exception as e:
                    logger.warning(f"Vision selector failed: {selector} - {str(e)}")

        except Exception as e:
            logger.error(f"Vision navigation failed: {str(e)}")

        return False

    async def _scroll_and_wait(self):
        """Scroll through page to trigger dynamic content loading"""
        try:
            # Scroll down in steps to trigger lazy loading
            for i in range(3):
                await self.page.evaluate(f"window.scrollTo(0, {i * 1000})")
                await asyncio.sleep(1)

            # Scroll back to top
            await self.page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(2)

            logger.info("Completed scroll and wait strategy")
        except Exception as e:
            logger.error(f"Scroll strategy failed: {str(e)}")

    async def _navigate_to_floor_plans(self) -> bool:
        """Navigate to floor plans section using vision guidance"""
        try:
            # Take screenshot of current page
            screenshot = await self.page.screenshot(full_page=True)

            # Ask vision model where to click for floor plans
            click_target = await self._vision_find_floor_plans_button(screenshot)

            if click_target:
                # Click the identified element
                await self.page.click(click_target, timeout=self.element_timeout)
                await asyncio.sleep(3)  # Wait for page to load
                return True

            # Fallback: try common selectors
            common_selectors = [
                'a[href*="floor-plan"]', 'a[href*="floorplan"]',
                'button:has-text("Floor Plans")', 'a:has-text("Floor Plans")',
                '.floor-plans', '#floor-plans'
            ]

            for selector in common_selectors:
                try:
                    await self.page.click(selector, timeout=2000)
                    await asyncio.sleep(2)
                    return True
                except:
                    continue

            return False

        except Exception as e:
            logger.error(f"Error navigating to floor plans: {str(e)}")
            return False

    async def _navigate_to_pricing_page(self) -> bool:
        """Navigate to pricing/application page"""
        try:
            # Try common pricing page links
            pricing_selectors = [
                'a[href*="pricing"]', 'a[href*="rent"]', 'a[href*="rates"]',
                'button:has-text("Pricing")', 'a:has-text("View Pricing")',
                'a[href*="apply"]', 'button:has-text("Apply Now")'
            ]

            for selector in pricing_selectors:
                try:
                    await self.page.click(selector, timeout=2000)
                    await asyncio.sleep(3)
                    return True
                except:
                    continue

            return False

        except Exception as e:
            logger.error(f"Error navigating to pricing page: {str(e)}")
            return False

    async def _extract_unit_pricing(self) -> List[Dict]:
        """Extract unit pricing information from current page"""
        try:
            # Take screenshot for vision analysis
            screenshot = await self.page.screenshot(full_page=True)

            # Use vision model to extract pricing data
            pricing_data = await self._vision_extract_pricing(screenshot)
            return pricing_data

        except Exception as e:
            logger.error(f"Error extracting unit pricing: {str(e)}")
            return []

    async def _vision_find_concessions(self, screenshot: bytes) -> Optional[str]:
        """Use vision model to find concession information in screenshot"""
        return await self._vision_analyze_image(
            screenshot,
            "Look for any concession or special offer information on this apartment website. "
            "Extract the full text of any concessions, discounts, or special offers mentioned. "
            "Return only the concession text, or 'none' if no concessions are visible."
        )

    async def _vision_find_floor_plans_button(self, screenshot: bytes) -> Optional[str]:
        """Use vision model to locate floor plans button"""
        result = await self._vision_analyze_image(
            screenshot,
            "Find the button or link for 'Floor Plans', 'Floorplans', 'Units', or 'Pricing'. "
            "Return ONLY a valid CSS selector (no explanations, no markdown, no quotes). "
            "Examples: 'a[href*=\"floor-plans\"]', 'button.floor-plans', '.nav-floorplans' "
            "If no clear button/link found, return exactly 'none'."
        )

        if result and result.lower().strip() not in ['none', 'no', 'n/a', '']:
            # Clean up the result - extract just the CSS selector
            result = result.strip()
            # Remove any markdown code blocks
            if '```' in result:
                # Extract content between ```css and ```
                import re
                css_match = re.search(r'```css?\s*(.*?)\s*```', result, re.DOTALL)
                if css_match:
                    result = css_match.group(1).strip()
            # Remove quotes if present
            result = result.strip('`"\'')
            return result
        return None

    async def _vision_extract_pricing(self, screenshot: bytes) -> List[Dict]:
        """Use vision model to extract pricing information"""
        result = await self._vision_analyze_image(
            screenshot,
            "Extract all visible apartment unit pricing information. "
            "For each unit/floorplan, identify: "
            "- Floorplan name (e.g., '1BR/1BA', '2 Bedroom Deluxe') "
            "- Number of bedrooms "
            "- Number of bathrooms "
            "- Square footage (if visible) "
            "- Monthly rent price "
            "- Any lease term information "
            "- Availability status "
            "Return as a JSON array of objects with these fields."
        )

        logger.info(f"Vision pricing extraction result: {result[:500]}...")  # Debug log

        try:
            # Clean the result - remove markdown code blocks if present
            if result.startswith('```') and '```' in result:
                # Extract content between ```json and ```
                import re
                json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', result, re.DOTALL)
                if json_match:
                    result = json_match.group(1).strip()

            # Try to parse JSON from the cleaned result
            if result.startswith('[') and result.endswith(']'):
                return json.loads(result)
            else:
                # Fallback: try to extract structured data from text
                return self._parse_pricing_text(result)
        except Exception as e:
            logger.warning(f"Could not parse vision result as JSON: {str(e)} - Result: {result[:200]}...")
            return []
            return []

    async def _vision_analyze_image(self, screenshot: bytes, prompt: str) -> str:
        """Analyze image using vision model (OpenAI GPT-4V)"""
        if not self.openai_api_key:
            logger.warning("OpenAI API key not available for vision analysis")
            return "none"

        try:
            import openai

            client = openai.OpenAI(api_key=self.openai_api_key)

            # Convert screenshot to base64
            image_b64 = base64.b64encode(screenshot).decode('utf-8')

            response = client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_b64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=self.vision_max_tokens,
                temperature=self.vision_temperature
            )

            result = response.choices[0].message.content.strip()
            return result

        except Exception as e:
            logger.error(f"Vision analysis error: {str(e)}")
            return "none"

    def _parse_pricing_text(self, text: str) -> List[Dict]:
        """Fallback parser for pricing text when JSON parsing fails"""
        # This is a simple fallback - in production you'd want more sophisticated parsing
        units = []

        # Look for patterns like "1BR/1BA $1500" or "2 Bedroom $2000"
        import re

        # Simple regex patterns for common formats
        patterns = [
            r'(\d+)\s*(?:BR|Bedroom|bedroom).*?\$?(\d{3,5})',
            r'(\w+)\s*(?:BR|Bedroom|bedroom).*?\$?(\d{3,5})',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    bedrooms = int(match[0]) if match[0].isdigit() else 1
                    rent = int(match[1])

                    units.append({
                        'floorplan_name': f"{bedrooms}BR",
                        'bedrooms': bedrooms,
                        'bathrooms': 1.0,
                        'monthly_rent': rent,
                        'confidence_score': 0.3  # Low confidence for fallback parsing
                    })
                except:
                    continue

        return units

    async def store_rental_data(self, property_id: int, rental_data: List[RentalData]) -> int:
        """
        Store extracted rental data in the database

        Args:
            property_id: ID from properties_basic table
            rental_data: List of RentalData objects to store

        Returns:
            Number of records successfully stored
        """
        if not self.supabase:
            logger.warning("Supabase client not available - skipping database storage")
            return 0

        stored_count = 0

        for rental in rental_data:
            try:
                # Convert to database format
                db_data = {
                    'property_id': property_id,
                    'floorplan_name': rental.floorplan_name,
                    'bedrooms': rental.bedrooms,
                    'bathrooms': rental.bathrooms,
                    'sqft': rental.sqft,
                    'monthly_rent': rental.monthly_rent,
                    'lease_term_months': rental.lease_term_months,
                    'lease_term': rental.lease_term,  # Descriptive lease term
                    'concessions': rental.concessions,
                    'availability_date': rental.availability_date,
                    'availability_status': rental.availability_status,
                    'extracted_at': datetime.now(),
                    'data_source': rental.data_source,
                    'confidence_score': rental.confidence_score,
                    'raw_data': rental.raw_data or {}
                }

                # Insert into rental_prices table
                result = self.supabase.table('rental_prices').insert(db_data).execute()

                if result.data:
                    stored_count += 1
                    logger.info(f"Stored rental data: {rental.floorplan_name} - ${rental.monthly_rent}")
                else:
                    logger.warning(f"Failed to store rental data: {rental.floorplan_name}")

            except Exception as e:
                logger.error(f"Database error storing rental data: {str(e)}")
                continue

        logger.info(f"Successfully stored {stored_count}/{len(rental_data)} rental records")
        return stored_count

    async def run_extraction_pipeline(self, property_url: str, property_id: int = None) -> Dict:
        """
        Run the complete rental data extraction pipeline

        Args:
            property_url: URL of the property to extract data from
            property_id: Property ID from database (optional)

        Returns:
            Summary of the extraction process
        """
        start_time = datetime.now()

        # Extract rental data with enhanced debugging
        rental_data = await self.extract_rental_data_with_debug(property_url, property_id)

        # Store in database if property_id provided
        stored_count = 0
        if property_id and rental_data:
            stored_count = await self.store_rental_data(property_id, rental_data)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        summary = {
            'property_url': property_url,
            'property_id': property_id,
            'rental_records_extracted': len(rental_data),
            'rental_records_stored': stored_count,
            'duration_seconds': duration,
            'extraction_success': len(rental_data) > 0,
            'timestamp': end_time.isoformat()
        }

        logger.info(f"Rental extraction pipeline complete: {summary}")
        return summary

    # ===== MULTI-STEP FLOOR PLAN AGENT METHODS =====

    async def navigate_floor_plan_flow(self, url: str) -> List[Dict[str, Any]]:
        """
        Navigate complex apartment websites using multi-step floor plan flow:
        Floor Plans → Availability → Apply Now

        Args:
            url: The apartment website URL

        Returns:
            List of rental data dictionaries with pricing information
        """
        logger.info(f"🏢 Starting multi-step floor plan navigation for {url}")

        try:
            # Step 1: Load page with cookie handling
            if not await self.load_page_safely(url):
                logger.error("Failed to load page safely")
                return []

            # Step 2: Navigate to Floor Plans section
            if not await self.click_navigation_item("Floor Plans", "floor plans", "floorplans"):
                logger.warning("Could not find Floor Plans navigation")
                # Try alternative approaches
                if not await self.handle_floor_plan_submenu():
                    logger.error("Floor plan navigation failed")
                    return []

            await self.human_delay("page_navigation")

            # Step 3: Find and click Availability section
            if not await self.find_availability_section():
                logger.warning("Could not find Availability section")
                # Continue anyway - some sites show pricing on floor plans page

            await self.human_delay("page_navigation")

            # Step 4: Extract pricing from current page first
            rental_data = await self.extract_pricing_from_current_page(url)

            # Step 5: If limited data, try clicking specific units to get more pricing
            if len(rental_data) < 3:  # Less than 3 units found
                logger.info("Limited pricing found, attempting unit-specific extraction")
                additional_data = await self.click_specific_unit_apply()
                rental_data.extend(additional_data)

            logger.info(f"🏢 Multi-step navigation complete: {len(rental_data)} rental records")
            return rental_data

        except Exception as e:
            logger.error(f"Multi-step floor plan navigation failed: {str(e)}")
            return []

    async def click_navigation_item(self, primary_text: str, *alternatives: str) -> bool:
        """
        Click navigation item using text matching with alternatives.

        Args:
            primary_text: Primary text to search for
            alternatives: Alternative text variations

        Returns:
            True if navigation item was found and clicked
        """
        try:
            # Take screenshot for vision analysis
            screenshot = await self.page.screenshot(full_page=True)

            # Use vision to find navigation elements
            prompt = f"""
            Analyze this apartment website screenshot and locate navigation items.
            Look for any of these navigation texts: {primary_text}, {', '.join(alternatives)}

            Return the bounding box coordinates of the navigation element if found.
            Format: {{"x": number, "y": number, "width": number, "height": number}}
            If not found, return null.
            """

            vision_result = await self.vision_analyze_page(screenshot, prompt)

            if vision_result and 'bounding_box' in vision_result:
                bbox = vision_result['bounding_box']

                # Click the center of the bounding box
                center_x = bbox['x'] + bbox['width'] / 2
                center_y = bbox['y'] + bbox['height'] / 2

                await self.page.mouse.move(center_x, center_y)
                await self.human_delay("mouse_movement")
                await self.page.mouse.click(center_x, center_y)

                logger.info(f"✅ Clicked navigation item: {primary_text}")
                return True

            # Fallback: Try text-based selectors
            selectors = [
                f"text={primary_text}",
                f"text={primary_text.lower()}",
                f"text={primary_text.upper()}"
            ]

            for alt in alternatives:
                selectors.extend([
                    f"text={alt}",
                    f"text={alt.lower()}",
                    f"text={alt.upper()}"
                ])

            for selector in selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        await element.click()
                        logger.info(f"✅ Clicked navigation item with selector: {selector}")
                        return True
                except Exception:
                    continue

            logger.warning(f"❌ Could not find navigation item: {primary_text}")
            return False

        except Exception as e:
            logger.error(f"Navigation click failed: {str(e)}")
            return False

    async def handle_floor_plan_submenu(self) -> bool:
        """
        Handle floor plan submenu navigation when main navigation doesn't work.

        Returns:
            True if successfully navigated to floor plans
        """
        try:
            # Look for common floor plan submenu patterns
            submenu_selectors = [
                "a[href*='floor-plan']",
                "a[href*='floorplan']",
                "a[href*='floor_plans']",
                "[data-section='floor-plans']",
                ".floor-plans-link",
                ".floorplans-link"
            ]

            for selector in submenu_selectors:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        # Click the first available element
                        await elements[0].click()
                        await self.human_delay("page_navigation")
                        logger.info(f"✅ Found floor plans via submenu: {selector}")
                        return True
                except Exception:
                    continue

            # Try vision-based approach for submenu detection
            screenshot = await self.page.screenshot(full_page=True)
            prompt = """
            Look for any submenu or dropdown that contains floor plans, floorplans, or unit types.
            Return the bounding box if you find such an element.
            """

            vision_result = await self.vision_analyze_page(screenshot, prompt)
            if vision_result and 'bounding_box' in vision_result:
                bbox = vision_result['bounding_box']
                center_x = bbox['x'] + bbox['width'] / 2
                center_y = bbox['y'] + bbox['height'] / 2

                await self.page.mouse.click(center_x, center_y)
                await self.human_delay("page_navigation")
                logger.info("✅ Found floor plans via vision submenu detection")
                return True

            return False

        except Exception as e:
            logger.error(f"Floor plan submenu handling failed: {str(e)}")
            return False

    async def find_availability_section(self) -> bool:
        """
        Find and navigate to the availability section of the website.

        Returns:
            True if availability section was found and clicked
        """
        try:
            # Common availability section selectors
            availability_selectors = [
                "text=Availability",
                "text=Available",
                "text=Available Units",
                "text=Check Availability",
                "a[href*='availability']",
                "[data-section='availability']",
                ".availability-link"
            ]

            for selector in availability_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        await element.click()
                        await self.human_delay("page_navigation")
                        logger.info(f"✅ Found availability section: {selector}")
                        return True
                except Exception:
                    continue

            # Vision-based availability detection
            screenshot = await self.page.screenshot(full_page=True)
            prompt = """
            Look for any buttons, links, or sections related to availability, available units,
            or checking availability on this apartment website.
            Return the bounding box if found.
            """

            vision_result = await self.vision_analyze_page(screenshot, prompt)
            if vision_result and 'bounding_box' in vision_result:
                bbox = vision_result['bounding_box']
                center_x = bbox['x'] + bbox['width'] / 2
                center_y = bbox['y'] + bbox['height'] / 2

                await self.page.mouse.click(center_x, center_y)
                await self.human_delay("page_navigation")
                logger.info("✅ Found availability section via vision")
                return True

            logger.info("ℹ️ Availability section not found - continuing with current page")
            return False

        except Exception as e:
            logger.error(f"Availability section search failed: {str(e)}")
            return False

    async def click_specific_unit_apply(self) -> List[Dict[str, Any]]:
        """
        Click on specific unit listings to access detailed pricing pages.

        Returns:
            List of rental data extracted from unit detail pages
        """
        rental_data = []

        try:
            # Look for unit listing elements
            unit_selectors = [
                ".unit-listing",
                ".apartment-unit",
                ".floor-plan-unit",
                "[data-unit]",
                ".unit-card",
                ".available-unit"
            ]

            units_found = []
            for selector in unit_selectors:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        units_found.extend(elements[:3])  # Limit to first 3 units
                except Exception:
                    continue

            if not units_found:
                # Try vision-based unit detection
                screenshot = await self.page.screenshot(full_page=True)
                prompt = """
                Find individual apartment unit listings or floor plan options.
                Look for elements that represent specific units with pricing or "Apply" buttons.
                Return bounding boxes for up to 3 unit elements.
                """

                vision_result = await self.vision_analyze_page(screenshot, prompt)
                if vision_result and 'unit_boxes' in vision_result:
                    # This would require extending the vision analysis to return multiple boxes
                    pass

            # Process found units
            for i, unit_element in enumerate(units_found[:3]):  # Process up to 3 units
                try:
                    # Click the unit to open details
                    await unit_element.click()
                    await self.human_delay("page_navigation")

                    # Look for Apply button on the detail page
                    apply_data = await self.vision_analyze_apply_buttons()

                    if apply_data:
                        rental_data.extend(apply_data)

                    # Go back to unit listing
                    await self.page.go_back()
                    await self.human_delay("page_navigation")

                except Exception as e:
                    logger.warning(f"Failed to process unit {i+1}: {str(e)}")
                    continue

            logger.info(f"📋 Processed {len(units_found)} units, extracted {len(rental_data)} records")
            return rental_data

        except Exception as e:
            logger.error(f"Unit-specific extraction failed: {str(e)}")
            return []

    async def vision_analyze_apply_buttons(self) -> List[Dict[str, Any]]:
        """
        Use vision to analyze Apply buttons and extract pricing from application pages.

        Returns:
            List of rental data with pricing information
        """
        try:
            screenshot = await self.page.screenshot(full_page=True)

            prompt = """
            Analyze this apartment website page for Apply buttons and pricing information.

            1. Look for "Apply Now", "Apply", "Start Application" buttons
            2. Extract any visible pricing information (monthly rent, deposits, etc.)
            3. Note the unit type or floor plan if visible

            Return a JSON object with:
            - apply_buttons: array of bounding boxes for apply buttons
            - pricing_info: any visible pricing data
            - unit_type: the type of unit/floor plan shown
            """

            vision_result = await self.vision_analyze_page(screenshot, prompt)

            if not vision_result:
                return []

            rental_data = []

            # If apply buttons found, click one to get pricing
            if 'apply_buttons' in vision_result and vision_result['apply_buttons']:
                button = vision_result['apply_buttons'][0]  # Click first apply button

                center_x = button['x'] + button['width'] / 2
                center_y = button['y'] + button['height'] / 2

                await self.page.mouse.click(center_x, center_y)
                await self.human_delay("page_navigation")

                # Extract pricing from application page
                app_pricing = await self.extract_pricing_from_application()
                if app_pricing:
                    rental_data.extend(app_pricing)

                # Go back
                await self.page.go_back()
                await self.human_delay("page_navigation")

            # Also extract any pricing visible on current page
            if 'pricing_info' in vision_result:
                pricing_data = self._parse_vision_pricing(vision_result['pricing_info'])
                if pricing_data:
                    rental_data.extend(pricing_data)

            return rental_data

        except Exception as e:
            logger.error(f"Vision apply button analysis failed: {str(e)}")
            return []

    async def extract_pricing_from_application(self) -> List[Dict[str, Any]]:
        """
        Extract pricing information from application/lease pages.

        Returns:
            List of rental data dictionaries
        """
        try:
            # Wait for application page to load
            await self.page.wait_for_load_state('networkidle')
            await self.human_delay("page_load")

            screenshot = await self.page.screenshot(full_page=True)

            prompt = """
            Analyze this lease application page for detailed pricing information.

            Extract:
            - Monthly rent amounts
            - Security deposit
            - Application fees
            - Lease terms (6-month, 12-month, etc.)
            - Unit type/floor plan
            - Any special pricing or promotions

            Return structured pricing data.
            """

            vision_result = await self.vision_analyze_page(screenshot, prompt)

            if vision_result and 'pricing_data' in vision_result:
                return self._parse_vision_pricing(vision_result['pricing_data'])

            return []

        except Exception as e:
            logger.error(f"Application pricing extraction failed: {str(e)}")
            return []

    def _parse_vision_pricing(self, vision_pricing: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse pricing data from vision analysis results.

        Args:
            vision_pricing: Raw pricing data from vision analysis

        Returns:
            List of standardized rental data dictionaries
        """
        rental_data = []

        try:
            # Extract unit information
            unit_type = vision_pricing.get('unit_type', 'Unknown')
            monthly_rent = vision_pricing.get('monthly_rent')
            deposit = vision_pricing.get('security_deposit')
            lease_terms = vision_pricing.get('lease_terms', [])

            # Create rental record
            if monthly_rent:
                record = {
                    'unit_type': unit_type,
                    'monthly_rent': monthly_rent,
                    'security_deposit': deposit,
                    'lease_term_months': 12,  # Default to 12 months
                    'available_date': None,
                    'special_pricing': vision_pricing.get('special_pricing'),
                    'extraction_method': 'vision_application'
                }

                # Add multiple lease terms if available
                if lease_terms:
                    for term in lease_terms:
                        term_record = record.copy()
                        term_record['lease_term_months'] = term.get('months', 12)
                        term_record['monthly_rent'] = term.get('rent', monthly_rent)
                        rental_data.append(term_record)
                else:
                    rental_data.append(record)

            return rental_data

            return []

        except Exception as e:
            logger.error(f"Vision pricing parsing failed: {str(e)}")
            return []

    def _extract_best_monthly_rate(self, rental_data: List[Dict[str, Any]]) -> Optional[float]:
        """
        Extract the best (lowest) monthly rate from rental data.

        Args:
            rental_data: List of rental data dictionaries

        Returns:
            Best monthly rate found, or None if no valid rates
        """
        try:
            valid_rates = []
            for record in rental_data:
                rent = record.get('monthly_rent')
                if rent and isinstance(rent, (int, float)) and rent > 0:
                    # Only consider 12-month leases for consistency
                    if record.get('lease_term_months') == 12:
                        valid_rates.append(rent)

            if valid_rates:
                return min(valid_rates)  # Return the lowest rate

            # If no 12-month leases found, return the lowest rate overall
            all_rates = [r.get('monthly_rent') for r in rental_data
                        if r.get('monthly_rent') and isinstance(r.get('monthly_rent'), (int, float)) and r.get('monthly_rent') > 0]
            return min(all_rates) if all_rates else None

        except Exception as e:
            logger.error(f"Failed to extract best monthly rate: {str(e)}")
            return None

    def _is_complex_site(self, url: str) -> bool:
        """
        Determine if a website requires complex multi-step navigation.

        Args:
            url: The website URL to check

        Returns:
            True if the site is known to require multi-step navigation
        """
        complex_sites = [
            "thecollectiveuws.com",
            "bellmorningside.com",
            "novelwestmidtown.com",
            "altaporter.com"
            # Add more complex sites as they are discovered
        ]

        return any(site in url for site in complex_sites)


# Example usage
async def main():
    """Example usage of the Rental Data Agent"""
    async with RentalDataAgent() as agent:
        # Example property URL
        test_url = "https://example-apartments.com"

        # Run extraction (will fail without real URL and API keys)
        summary = await agent.run_extraction_pipeline(test_url)
        print("Extraction Summary:", json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())