import os
import json
import asyncio
import aiohttp
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PropertyBasicInfo:
    """Data structure for basic property information"""
    property_name: str
    property_url: str
    year_built: Optional[int] = None
    total_units: Optional[int] = None
    property_type: Optional[str] = None
    management_company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    confidence_score: float = 0.0
    website_complexity: str = 'medium'

class PropertyDiscoveryAgent:
    """
    Property Discovery Agent - Claude-based agent for discovering and extracting
    basic apartment property information using SERP API and lightweight scraping.
    """

    def __init__(self, serp_api_key: str = None, claude_api_key: str = None, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize the Property Discovery Agent

        Args:
            serp_api_key: SERP API key for property URL discovery
            claude_api_key: Anthropic Claude API key for information extraction
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
        """
        self.serp_api_key = serp_api_key or os.getenv('SERP_API_KEY')
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

        # HTTP session for requests
        self.session = None

        # Claude API configuration
        self.claude_model = "claude-3-haiku-20240307"  # Cost-effective model
        self.max_tokens = 1000

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def discover_properties(self, location: str = "Atlanta, GA", max_properties: int = 100) -> List[PropertyBasicInfo]:
        """
        Main method to discover properties in a given location

        Args:
            location: Location to search for properties (e.g., "Atlanta, GA")
            max_properties: Maximum number of properties to discover

        Returns:
            List of PropertyBasicInfo objects with basic property data
        """
        logger.info(f"Starting property discovery for {location}, max {max_properties} properties")

        # Step 1: Find property URLs via SERP API
        property_urls = await self.find_property_urls_via_serp(location, max_properties)
        logger.info(f"Found {len(property_urls)} potential property URLs")

        # Step 2: Extract basic info from each URL
        discovered_properties = []
        for i, url in enumerate(property_urls):
            logger.info(f"Processing property {i+1}/{len(property_urls)}: {url}")
            try:
                basic_info = await self.extract_basic_property_info(url)
                if basic_info:
                    discovered_properties.append(basic_info)
                    logger.info(f"Successfully extracted info for: {basic_info.property_name}")
                else:
                    logger.warning(f"Failed to extract info from: {url}")
            except Exception as e:
                logger.error(f"Error processing {url}: {str(e)}")
                continue

        logger.info(f"Discovery complete. Found {len(discovered_properties)} properties with basic info")
        return discovered_properties

    async def find_property_urls_via_serp(self, location: str, max_results: int = 100) -> List[str]:
        """
        Use SERP API to find apartment property websites

        Args:
            location: Location to search (e.g., "Atlanta, GA")
            max_results: Maximum number of URLs to return

        Returns:
            List of property website URLs
        """
        if not self.serp_api_key:
            raise ValueError("SERP API key is required")

        # Construct search queries for apartment properties
        search_queries = [
            f"apartments for rent {location}",
            f"apartment communities {location}",
            f"luxury apartments {location}",
            f"affordable apartments {location}",
            f"senior living {location}",
            f"student housing {location}"
        ]

        all_urls = set()

        for query in search_queries:
            try:
                urls = await self._serp_search(query, max_results // len(search_queries))
                all_urls.update(urls)
                if len(all_urls) >= max_results:
                    break
            except Exception as e:
                logger.error(f"Error searching for '{query}': {str(e)}")
                continue

        # Filter and clean URLs
        filtered_urls = []
        for url in list(all_urls)[:max_results]:
            if self._is_valid_property_url(url):
                filtered_urls.append(url)

        return filtered_urls

    async def _serp_search(self, query: str, max_results: int = 20) -> List[str]:
        """Execute SERP API search and extract property URLs"""
        serp_url = "https://serpapi.com/search"
        params = {
            "api_key": self.serp_api_key,
            "q": query,
            "engine": "google",
            "num": max_results,
            "start": 0
        }

        async with self.session.get(serp_url, params=params) as response:
            if response.status != 200:
                raise Exception(f"SERP API error: {response.status}")

            data = await response.json()

        urls = []
        # Extract URLs from organic results
        if "organic_results" in data:
            for result in data["organic_results"]:
                if "link" in result:
                    urls.append(result["link"])

        return urls

    def _is_valid_property_url(self, url: str) -> bool:
        """Check if URL is likely a valid apartment property website"""
        if not url or not url.startswith(('http://', 'https://')):
            return False

        # Exclude common non-property sites
        exclude_domains = [
            'google.com', 'facebook.com', 'twitter.com', 'instagram.com',
            'youtube.com', 'yelp.com', 'zillow.com', 'apartments.com',
            'realtor.com', 'craigslist.org', 'facebook.com', 'linkedin.com'
        ]

        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower()

        for exclude in exclude_domains:
            if exclude in domain:
                return False

        # Include likely property-related domains
        property_indicators = [
            'apartments', 'apartment', 'community', 'living', 'residences',
            'homes', 'place', 'village', 'gardens', 'park', 'ridge', 'hill',
            'valley', 'creek', 'lakes', 'river', 'bay', 'beach', 'mountain'
        ]

        return any(indicator in domain for indicator in property_indicators)

    async def extract_basic_property_info(self, url: str) -> Optional[PropertyBasicInfo]:
        """
        Extract basic property information using lightweight HTML fetching and Claude

        Args:
            url: Property website URL

        Returns:
            PropertyBasicInfo object or None if extraction fails
        """
        try:
            # Step 1: Fetch lightweight HTML (meta tags, headers, basic content)
            light_html = await self.fetch_light_html(url)
            if not light_html:
                return None

            # Step 2: Use Claude to extract basic information
            extracted_data = await self._claude_extract_basic_info(light_html, url)

            if not extracted_data or not extracted_data.get('property_name'):
                return None

            # Step 3: Create PropertyBasicInfo object
            property_info = PropertyBasicInfo(
                property_name=extracted_data.get('property_name', ''),
                property_url=url,
                year_built=extracted_data.get('year_built'),
                total_units=extracted_data.get('total_units'),
                property_type=extracted_data.get('property_type'),
                management_company=extracted_data.get('management_company'),
                address=extracted_data.get('address'),
                city=extracted_data.get('city'),
                state=extracted_data.get('state'),
                zip_code=extracted_data.get('zip_code'),
                confidence_score=extracted_data.get('confidence_score', 0.0),
                website_complexity=extracted_data.get('website_complexity', 'medium')
            )

            return property_info

        except Exception as e:
            logger.error(f"Error extracting basic info from {url}: {str(e)}")
            return None

    async def fetch_light_html(self, url: str, timeout: int = 10) -> Optional[str]:
        """
        Fetch lightweight HTML content (meta tags, headers, minimal content)

        Args:
            url: Website URL to fetch
            timeout: Request timeout in seconds

        Returns:
            Lightweight HTML string or None if failed
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }

            async with self.session.get(url, headers=headers, timeout=timeout) as response:
                if response.status != 200:
                    logger.warning(f"HTTP {response.status} for {url}")
                    return None

                # Get only the first 50KB to keep it lightweight
                content = await response.text()
                light_content = content[:50000]  # 50KB limit

                return light_content

        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return None

    async def _claude_extract_basic_info(self, html_content: str, url: str) -> Optional[Dict]:
        """
        Use Claude to extract basic property information from HTML content

        Args:
            html_content: Lightweight HTML content
            url: Original URL for context

        Returns:
            Dictionary with extracted information or None if failed
        """
        if not self.claude_api_key:
            raise ValueError("Claude API key is required")

        prompt = f"""
        Analyze this apartment property website HTML content and extract basic property information.

        URL: {url}

        HTML Content (first 50KB):
        {html_content[:10000]}... [truncated for brevity]

        Please extract the following information in JSON format:
        - property_name: The name of the apartment community
        - year_built: Year the property was built (if mentioned)
        - total_units: Total number of apartment units
        - property_type: Type of property (luxury, affordable, senior, student, etc.)
        - management_company: Property management company name
        - address: Full street address
        - city: City name
        - state: State abbreviation
        - zip_code: ZIP code
        - confidence_score: Your confidence in the extraction (0.0 to 1.0)
        - website_complexity: How complex the website appears ('simple', 'medium', 'complex')

        Return only valid JSON. If information is not available, use null for that field.
        """

        try:
            import anthropic

            client = anthropic.Anthropic(api_key=self.claude_api_key)

            response = client.messages.create(
                model=self.claude_model,
                max_tokens=self.max_tokens,
                temperature=0.1,  # Low temperature for consistent extraction
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Extract JSON from response
            content = response.content[0].text
            # Find JSON in the response (Claude might add extra text)
            json_start = content.find('{')
            json_end = content.rfind('}') + 1

            if json_start == -1 or json_end == 0:
                logger.error(f"No JSON found in Claude response for {url}")
                return None

            json_str = content[json_start:json_end]
            extracted_data = json.loads(json_str)

            return extracted_data

        except Exception as e:
            logger.error(f"Claude extraction error for {url}: {str(e)}")
            return None

    async def store_property_basics(self, properties: List[PropertyBasicInfo]) -> int:
        """
        Store discovered properties in the database

        Args:
            properties: List of PropertyBasicInfo objects to store

        Returns:
            Number of properties successfully stored
        """
        if not self.supabase:
            logger.warning("Supabase client not available - skipping database storage")
            return 0

        stored_count = 0

        for prop in properties:
            try:
                # Convert to database format
                db_data = {
                    'property_name': prop.property_name,
                    'property_url': prop.property_url,
                    'year_built': prop.year_built,
                    'total_units': prop.total_units,
                    'property_type': prop.property_type,
                    'management_company': prop.management_company,
                    'address': prop.address,
                    'city': prop.city,
                    'state': prop.state,
                    'zip_code': prop.zip_code,
                    'confidence_score': prop.confidence_score,
                    'website_complexity': prop.website_complexity,
                    'last_verified': datetime.now().date()
                }

                # Insert or update (upsert on property_url)
                result = self.supabase.table('properties_basic').upsert(
                    db_data,
                    on_conflict='property_url'
                ).execute()

                if result.data:
                    stored_count += 1
                    logger.info(f"Stored property: {prop.property_name}")
                else:
                    logger.warning(f"Failed to store property: {prop.property_name}")

            except Exception as e:
                logger.error(f"Database error storing {prop.property_name}: {str(e)}")
                continue

        logger.info(f"Successfully stored {stored_count}/{len(properties)} properties")
        return stored_count

    async def run_discovery_pipeline(self, location: str = "Atlanta, GA", max_properties: int = 100) -> Dict:
        """
        Run the complete discovery pipeline

        Args:
            location: Location to search
            max_properties: Maximum properties to discover

        Returns:
            Summary of the discovery process
        """
        start_time = datetime.now()

        # Discover properties
        properties = await self.discover_properties(location, max_properties)

        # Store in database
        stored_count = await self.store_property_basics(properties)

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        summary = {
            'location': location,
            'properties_discovered': len(properties),
            'properties_stored': stored_count,
            'duration_seconds': duration,
            'average_time_per_property': duration / len(properties) if properties else 0,
            'timestamp': end_time.isoformat()
        }

        logger.info(f"Discovery pipeline complete: {summary}")
        return summary


# Example usage
async def main():
    """Example usage of the Property Discovery Agent"""
    async with PropertyDiscoveryAgent() as agent:
        # Run discovery for Atlanta, GA
        summary = await agent.run_discovery_pipeline("Atlanta, GA", max_properties=50)
        print("Discovery Summary:", json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())