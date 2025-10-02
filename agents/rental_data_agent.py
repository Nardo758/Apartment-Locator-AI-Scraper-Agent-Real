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

# Template system imports
from template_manager import TemplateManager
from smart_scraper import SmartScraper
from website_templates import update_template_success

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

        # Initialize template-based scraping system
        self.template_manager = TemplateManager()
        self.smart_scraper = SmartScraper(self.template_manager)
        self.use_template_system = True  # Enable template-based scraping by default

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

        # Cookie consent database for known sites
        self.cookie_consent_patterns = {
            'altaporter.com': {
                'accept_selector': 'button[onclick*="accept"]',
                'reject_selector': 'button[class*="reject"]',
                'storage_key': 'cookiePrefs',
                'local_storage': {'cookieConsent': 'true', 'privacySettings': '{"necessary":true}'}
            },
            'bellmorningside.com': {
                'accept_selector': 'button[data-action="accept"]',
                'reject_selector': 'button[data-action="reject"]',
                'storage_key': 'gdpr_consent',
                'local_storage': {'gdprAccepted': 'true'}
            },
            'thecollectiveuws.com': {
                'accept_selector': '.cookie-accept',
                'reject_selector': '.cookie-reject',
                'storage_key': 'cookie_consent',
                'local_storage': {'cookie_consent': 'accepted'}
            },
            'novelwestmidtown.com': {
                'accept_selector': '#accept-cookies',
                'reject_selector': '#reject-cookies',
                'storage_key': 'cookieSettings',
                'local_storage': {'cookieSettings': '{"analytics":false,"marketing":false}'}
            }
        }

        # Human-like behavior configuration
        self.human_behavior = {
            'mouse_movements': True,
            'random_delays': True,
            'scroll_behavior': True,
            'realistic_viewport': True,
            'stealth_mode': True
        }

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
        """Initialize Playwright browser with advanced stealth and human-like features"""
        try:
            from playwright.async_api import async_playwright

            self.playwright = await async_playwright().start()

            # Enhanced browser launch with stealth features
            browser_args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled',  # Remove automation indicator
                '--disable-web-security',  # Allow cross-origin requests
                '--disable-features=VizDisplayCompositor'  # Reduce resource usage
            ]

            # Add stealth mode if enabled
            if self.human_behavior.get('stealth_mode', False):
                browser_args.extend([
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images',  # Optional: speed up loading
                    '--disable-javascript',  # Optional: for very stealthy mode
                ])

            self.browser = await self.playwright.chromium.launch(
                headless=True,  # Keep headless for production
                args=browser_args
            )

            # Create context with realistic browser fingerprint
            context_options = {
                'viewport': {'width': 1920, 'height': 1080} if self.human_behavior.get('realistic_viewport', True) else {'width': 1920, 'height': 1080},
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'locale': 'en-US',
                'timezone_id': 'America/New_York',
                'geolocation': {'latitude': 33.7490, 'longitude': -84.3880},  # Atlanta coordinates
                'permissions': ['geolocation'],
                'extra_http_headers': {
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            }

            self.context = await self.browser.new_context(**context_options)
            self.page = await self.context.new_page()

            # Apply stealth evasion scripts
            await self._apply_stealth_evasion()

            # Set up human-like behavior monitoring
            await self._setup_human_behavior()

            logger.info("Browser initialized with advanced stealth features")

        except Exception as e:
            logger.error(f"Failed to initialize browser: {str(e)}")
            raise

    async def _apply_stealth_evasion(self):
        """Apply stealth evasion techniques to avoid detection"""
        stealth_script = """
        // Remove webdriver property
        delete Object.getPrototypeOf(navigator).webdriver;

        // Mock chrome runtime
        window.chrome = { runtime: {} };

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' }
            ]
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });

        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );

        // Mock hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 8
        });

        // Mock device memory
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8
        });
        """

        await self.page.add_init_script(stealth_script)

    async def _setup_human_behavior(self):
        """Set up human-like behavior patterns"""
        # Add random mouse movements and scrolling
        if self.human_behavior.get('mouse_movements', True):
            await self.page.add_init_script("""
            // Random mouse movements
            let mouseX = Math.random() * window.innerWidth;
            let mouseY = Math.random() * window.innerHeight;

            setInterval(() => {
                mouseX += (Math.random() - 0.5) * 20;
                mouseY += (Math.random() - 0.5) * 20;
                mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
                mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
            }, 1000);
            """)

    async def _preemptive_cookie_handling(self, domain: str):
        """Set cookies and local storage before visiting a site"""
        if domain in self.cookie_consent_patterns:
            pattern = self.cookie_consent_patterns[domain]

            # Set local storage preferences
            if 'local_storage' in pattern:
                for key, value in pattern['local_storage'].items():
                    await self.page.add_init_script(f"""
                    localStorage.setItem('{key}', '{value}');
                    """)

            # Set cookies
            cookies = [
                {
                    'name': 'cookie_consent',
                    'value': 'accepted',
                    'domain': domain,
                    'path': '/'
                },
                {
                    'name': pattern.get('storage_key', 'gdpr_consent'),
                    'value': 'true',
                    'domain': domain,
                    'path': '/'
                }
            ]

            await self.context.add_cookies(cookies)
            logger.info(f"🍪 Pre-emptive cookie handling applied for {domain}")

    async def _build_browsing_history(self, domain: str):
        """Build realistic browsing history by visiting internal pages first"""
        if domain in ['altaporter.com', 'bellmorningside.com', 'thecollectiveuws.com', 'novelwestmidtown.com']:
            internal_pages = ['/about', '/contact', '/privacy', '/terms']

            for path in internal_pages[:2]:  # Visit just 2 pages to not waste time
                try:
                    url = f'https://{domain}{path}'
                    await self.page.goto(url, timeout=5000, wait_until='domcontentloaded')
                    await self.human_delay("page_load")
                    logger.debug(f"Built browsing history: visited {url}")
                except Exception as e:
                    logger.debug(f"Failed to visit {path}: {str(e)}")
                    continue

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

    async def extract_rental_data(self, property_url: str, property_id: int = None) -> List[RentalData]:
        """
        Main method to extract rental data from a property URL.
        Uses template-based scraping system for efficient and reliable extraction.

        Args:
            property_url: URL of the apartment property to scrape
            property_id: ID from properties_basic table (optional)

        Returns:
            List of RentalData objects with pricing information
        """
        logger.info(f"🏠 Starting rental data extraction for: {property_url}")

        rental_data = []

        try:
            # ===== TEMPLATE-BASED EXTRACTION (PRIMARY METHOD) =====
            if self.use_template_system:
                logger.info("🎯 Attempting template-based extraction...")
                template_result = await self._extract_with_template_system(property_url)
                if template_result and len(template_result.get("units", [])) > 0:
                    logger.info(f"✅ Template extraction successful: {len(template_result['units'])} units found")

                    # Convert template results to RentalData objects
                    for unit in template_result["units"]:
                        rental_info = RentalData(
                            floorplan_name=unit.get('floorplan_name', 'Template Extracted'),
                            bedrooms=unit.get('bedrooms', 1),
                            bathrooms=unit.get('bathrooms', 1.0),
                            sqft=unit.get('sqft'),
                            monthly_rent=unit.get('monthly_rent', 0.0),
                            lease_term_months=unit.get('lease_term_months', 12),
                            lease_term=unit.get('lease_term'),
                            concessions=unit.get('concessions'),
                            availability_date=unit.get('availability_date'),
                            availability_status=unit.get('availability_status', 'available'),
                            confidence_score=unit.get('confidence_score', 0.8),
                            data_source='template_agent',
                            raw_data=unit
                        )
                        rental_data.append(rental_info)

                    # Update template success metrics
                    template_type = template_result.get("scrape_metadata", {}).get("template_type", "unknown")
                    if template_type != "unknown":
                        update_template_success(template_type, True)

                    return rental_data

                else:
                    logger.info("⚠️ Template extraction failed or returned no data, falling back to traditional method")
                    # Update template failure metrics
                    template_type = template_result.get("scrape_metadata", {}).get("template_type", "unknown") if template_result else "unknown"
                    if template_type != "unknown":
                        update_template_success(template_type, False)

            # ===== TRADITIONAL EXTRACTION (FALLBACK METHOD) =====
            logger.info("🔄 Falling back to traditional extraction method...")

            # Load page safely with human-like behavior
            if not await self.load_page_safely(property_url):
                logger.error("❌ Failed to load page safely")
                return []

            # Extract concessions first
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

    async def _extract_with_template_system(self, property_url: str) -> Optional[Dict[str, Any]]:
        """
        Extract rental data using the template-based scraping system.

        Args:
            property_url: URL to scrape

        Returns:
            Dictionary with extraction results and metadata, or None if failed
        """
        try:
            # Use the smart scraper for template-based extraction
            result = await self.smart_scraper.scrape_property(property_url)

            if result and isinstance(result, dict):
                return result
            else:
                logger.warning("Template system returned invalid result")
                return None

        except Exception as e:
            logger.error(f"Template-based extraction failed: {str(e)}")
            return None

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
            # New delay types for advanced cookie handling
            "navigation_start": random.uniform(0.5, 2.0),  # Delay before navigation
            "page_load_observation": random.uniform(*self.human_timing["page_load_observation"]),  # Time to "observe" loaded page
            "reading_speed": random.uniform(*self.human_timing["reading_speed"]),  # Time to "read" elements
            "decision_pause": random.uniform(*self.human_timing["decision_pause"]),  # Thinking time before action
            "mouse_movements": random.uniform(*self.human_timing["mouse_movements"]),  # Mouse movement time
            "scroll_behavior": random.uniform(*self.human_timing["scroll_behavior"]),  # Natural scrolling
            "typing_speed": random.uniform(*self.human_timing["typing_speed"]),  # If typing is needed
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
        """Enhanced page loading with advanced cookie handling and human-like behavior"""

        try:
            # Extract domain for pre-emptive handling
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.replace('www.', '')

            # Reset cookie handling state for new page
            self._cookies_handled = False

            # PRE-EMPTIVE COOKIE HANDLING: Set cookies and local storage before visiting
            await self._preemptive_cookie_handling(domain)

            # BUILD BROWSING HISTORY: Visit internal pages first to appear like a returning user
            if self.human_behavior.get('build_history', True):
                await self._build_browsing_history(domain)

            # Set realistic viewport
            viewport_size = {"width": 1920, "height": 1080} if self.human_behavior.get('realistic_viewport', True) else {"width": 1280, "height": 800}
            await self.page.set_viewport_size(viewport_size)

            # HUMAN-LIKE NAVIGATION: Add random delay before navigation
            if self.human_behavior.get('random_delays', True):
                await self.human_delay("navigation_start")

            # Navigate to page with realistic timing
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)

            # HUMAN-LIKE BEHAVIOR: Realistic page reading time
            await self.human_delay("page_load_observation")

            # Initial cookie handling with human-like interaction
            initial_handled = await self.human_cookie_handling()
            if initial_handled:
                await self.human_delay("between_clicks")

            # Wait for delayed popups with human-like patience
            await self.human_delay("decision_pause")

            # Secondary cookie check with multi-step interaction
            if not self._cookies_handled:
                await self.human_cookie_handling()

            # HUMAN-LIKE SCROLLING: Natural content discovery
            if self.human_behavior.get('scroll_behavior', True):
                await self.page.evaluate("window.scrollBy(0, 200)")
                await self.human_delay("scroll_behavior")

            # Check if content is visible with multiple strategies
            if await self.is_content_visible():
                logger.info("✅ Content is visible after advanced cookie handling")
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

    async def human_cookie_handling(self) -> bool:
        """Advanced human-like cookie popup handling with multi-step interaction"""
        logger.info("🍪 Starting advanced human cookie handling...")

        # Step 1: Wait for page to settle (human-like observation)
        await self.human_delay("decision_pause")

        # Step 2: Try multiple close strategies with human-like precision
        close_selectors = [
            'button[class*="close"]',
            'text=X',
            '[aria-label*="close" i]',
            '.modal-close',
            'button:has-text("Close")',
            '.cookie-banner .close',
            '[data-close*="cookie"]',
            '.cookie-modal .close',
            '.onetrust-close-btn-handler',
            'button[aria-label*="close"]',
            '.close-cookies',
            '.popup-close',
            '[data-dismiss="modal"]',
            '.close-button'
        ]

        for selector in close_selectors:
            try:
                # Human-like delay before checking
                await self.human_delay("reading_speed")

                # Check if element exists and is visible
                if await self.page.is_visible(selector):
                    # Scroll into view naturally
                    await self.page.evaluate(f'document.querySelector("{selector}")?.scrollIntoView()')
                    await self.human_delay("element_hover")

                    # Move mouse realistically before clicking
                    if self.human_behavior.get('mouse_movements', True):
                        box = await self.page.query_selector(selector)
                        if box:
                            bbox = await box.bounding_box()
                            if bbox:
                                await self.page.mouse.move(
                                    bbox['x'] + bbox['width'] / 2,
                                    bbox['y'] + bbox['height'] / 2
                                )
                                await self.human_delay("mouse_movements")

                    # Click with human-like precision and timing
                    await self.page.click(selector, delay=random.randint(50, 150))
                    logger.info(f"✅ Closed popup using human-like interaction: {selector}")

                    # Mark as handled
                    self._cookies_handled = True
                    return True

            except Exception as e:
                logger.debug(f"Human close selector {selector} failed: {str(e)}")
                continue

        # Step 3: If close didn't work, try reject buttons with human-like interaction
        reject_selectors = [
            "text=Reject All",
            "text=Decline",
            "text=Decline All",
            "text=No Thanks",
            "button[data-action='reject-all']",
            "[data-testid='uc-reject-all-button']",
            ".cookie-reject",
            "#onetrust-reject-all-handler",
            "button[class*='reject']",
            "button[class*='decline']"
        ]

        for selector in reject_selectors:
            try:
                await self.human_delay("reading_speed")

                if await self.page.is_visible(selector):
                    # Human-like interaction sequence
                    await self.page.evaluate(f'document.querySelector("{selector}")?.scrollIntoView()')
                    await self.human_delay("element_hover")

                    if self.human_behavior.get('mouse_movements', True):
                        box = await self.page.query_selector(selector)
                        if box:
                            bbox = await box.bounding_box()
                            if bbox:
                                await self.page.mouse.move(
                                    bbox['x'] + bbox['width'] / 2,
                                    bbox['y'] + bbox['height'] / 2
                                )
                                await self.human_delay("mouse_movements")

                    await self.page.click(selector, delay=random.randint(50, 150))
                    logger.info(f"✅ Rejected cookies using human-like interaction: {selector}")

                    self._cookies_handled = True
                    return True

            except Exception as e:
                logger.debug(f"Human reject selector {selector} failed: {str(e)}")
                continue

        # Step 4: Multi-step interaction - click body first, then try again
        try:
            # Click somewhere neutral on the page
            await self.page.click('body', delay=random.randint(50, 150))
            await self.human_delay("between_clicks")

            # Tab to focus
            await self.page.keyboard.press('Tab')
            await self.human_delay("reading_speed")

            # Try close again
            if await self.page.is_visible('button[class*="close"]'):
                await self.page.keyboard.press('Enter')
                logger.info("✅ Closed popup using keyboard interaction")
                self._cookies_handled = True
                return True

        except Exception as e:
            logger.debug(f"Multi-step interaction failed: {str(e)}")

        logger.info("🍪 No cookie popups found or all handling attempts failed")
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
                        if element and await self.is_visible(element):
                            await self.human_like_click(overlay)
                            logger.info("🔒 OneTrust overlay dismissed by clicking on backdrop")
                            return True
                    except:
                        continue

            except Exception as e:
                logger.debug(f"OneTrust overlay handling failed: {str(e)}")

        except Exception as e:
            logger.error(f"Error handling OneTrust overlay: {str(e)}")

        logger.warning("Failed to handle OneTrust overlay")
        return False
