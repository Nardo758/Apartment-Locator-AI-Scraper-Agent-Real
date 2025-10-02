"""
Priority-Based Processing System for Apartment Scraper Agents

This module implements intelligent priority scoring and queue management
to optimize agent resource allocation based on property characteristics.
"""

import os
import asyncio
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PriorityScore:
    """Priority score breakdown for a property"""
    total_score: float
    unit_count_score: float
    property_type_score: float
    management_score: float
    complexity_score: float
    location_score: float
    priority_level: str  # 'high', 'medium', 'low'

class PrioritySystem:
    """
    Intelligent priority system for apartment property processing.

    Prioritizes properties based on:
    - Scale (unit count, building size)
    - Value (luxury status, management company)
    - Complexity (website difficulty)
    - Market factors (location demand)
    """

    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize the priority system

        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
        """
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if self.supabase_url and self.supabase_key:
            from supabase import create_client
            self.supabase = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None
            logger.warning("Supabase credentials not provided - database operations will be skipped")

        # Priority scoring weights
        self.weights = {
            'unit_count': 0.3,
            'property_type': 0.25,
            'management': 0.2,
            'complexity': 0.15,
            'location': 0.1
        }

        # Priority thresholds
        self.thresholds = {
            'high': 0.7,
            'medium': 0.4,
            'low': 0.0
        }

        # High-value property indicators
        self.luxury_keywords = [
            'luxury', 'premier', 'executive', 'high-end', 'premium',
            'deluxe', 'signature', 'resort', 'spa', 'concierge'
        ]

        self.major_management_companies = [
            'CBRE', 'Greystar', 'Equity Residential', 'AvalonBay',
            'Berkshire Hathaway', 'Thrive Communities', 'Mid-America',
            'Lincoln Property Company', 'Pinnacle', 'Drucker + Falk',
            'Bell Partners', 'Windsor Communities', 'Trinity Property Consultants'
        ]

        # High-demand locations (can be customized per market)
        self.high_demand_cities = [
            'Atlanta', 'Austin', 'Nashville', 'Raleigh', 'Charlotte',
            'Denver', 'Seattle', 'Portland', 'San Francisco', 'New York',
            'Boston', 'Miami', 'Phoenix', 'Dallas', 'Houston'
        ]

    def calculate_priority_score(self, property_data: Dict) -> PriorityScore:
        """
        Calculate comprehensive priority score for a property

        Args:
            property_data: Property information dictionary

        Returns:
            PriorityScore object with breakdown
        """
        # Extract property attributes
        total_units = property_data.get('total_units', 0)
        property_type = property_data.get('property_type', '').lower()
        management_company = property_data.get('management_company', '').strip()
        website_complexity = property_data.get('website_complexity', 'medium')
        city = property_data.get('city', '').strip()

        # Calculate individual scores (0.0 to 1.0)
        unit_count_score = self._score_unit_count(total_units)
        property_type_score = self._score_property_type(property_type)
        management_score = self._score_management_company(management_company)
        complexity_score = self._score_website_complexity(website_complexity)
        location_score = self._score_location(city)

        # Calculate weighted total score
        total_score = (
            unit_count_score * self.weights['unit_count'] +
            property_type_score * self.weights['property_type'] +
            management_score * self.weights['management'] +
            complexity_score * self.weights['complexity'] +
            location_score * self.weights['location']
        )

        # Determine priority level
        if total_score >= self.thresholds['high']:
            priority_level = 'high'
        elif total_score >= self.thresholds['medium']:
            priority_level = 'medium'
        else:
            priority_level = 'low'

        return PriorityScore(
            total_score=total_score,
            unit_count_score=unit_count_score,
            property_type_score=property_type_score,
            management_score=management_score,
            complexity_score=complexity_score,
            location_score=location_score,
            priority_level=priority_level
        )

    def _score_unit_count(self, total_units: int) -> float:
        """Score based on total number of units"""
        if total_units >= 300:
            return 1.0  # Large complex
        elif total_units >= 200:
            return 0.8  # Major property
        elif total_units >= 100:
            return 0.6  # Medium-large
        elif total_units >= 50:
            return 0.4  # Medium
        elif total_units >= 20:
            return 0.2  # Small
        else:
            return 0.1  # Very small

    def _score_property_type(self, property_type: str) -> float:
        """Score based on property type indicators"""
        if not property_type:
            return 0.3  # Neutral score

        # Check for luxury indicators
        for keyword in self.luxury_keywords:
            if keyword in property_type:
                return 0.9  # Luxury property

        # Check for other valuable types
        valuable_types = ['mid-rise', 'high-rise', 'garden', 'townhome']
        for vtype in valuable_types:
            if vtype in property_type:
                return 0.7

        return 0.3  # Standard apartment

    def _score_management_company(self, management_company: str) -> float:
        """Score based on management company reputation"""
        if not management_company:
            return 0.3  # Neutral score

        # Check major management companies
        for company in self.major_management_companies:
            if company.lower() in management_company.lower():
                return 0.9  # Major company

        return 0.3  # Unknown/independent management

    def _score_website_complexity(self, complexity: str) -> float:
        """Score based on website complexity (affects agent selection)"""
        complexity_scores = {
            'complex': 0.8,  # Needs vision agent
            'medium': 0.5,   # Could use either agent
            'simple': 0.2    # Claude agent sufficient
        }
        return complexity_scores.get(complexity.lower(), 0.5)

    def _score_location(self, city: str) -> float:
        """Score based on location demand"""
        if not city:
            return 0.3  # Neutral score

        # Check high-demand cities
        for demand_city in self.high_demand_cities:
            if demand_city.lower() in city.lower():
                return 0.8  # High-demand location

        return 0.3  # Standard location

    async def update_property_priorities(self, limit: int = None) -> Dict:
        """
        Update priority levels for all properties in the database

        Args:
            limit: Maximum number of properties to update (None for all)

        Returns:
            Summary of priority updates
        """
        if not self.supabase:
            logger.warning("Supabase client not available - skipping priority updates")
            return {'error': 'Supabase not configured'}

        try:
            # Fetch properties that need priority updates
            query = self.supabase.table('properties_basic').select('*')

            if limit:
                query = query.limit(limit)

            result = query.execute()

            if not result.data:
                return {'updated': 0, 'message': 'No properties found'}

            updated_count = 0
            priority_counts = {'high': 0, 'medium': 0, 'low': 0}

            for property_record in result.data:
                # Calculate priority score
                priority_score = self.calculate_priority_score(property_record)

                # Update database if priority changed
                if priority_score.priority_level != property_record.get('priority_level'):
                    self.supabase.table('properties_basic').update({
                        'priority_level': priority_score.priority_level,
                        'updated_at': datetime.now().isoformat()
                    }).eq('id', property_record['id']).execute()

                    updated_count += 1

                priority_counts[priority_score.priority_level] += 1

            return {
                'updated': updated_count,
                'total_processed': len(result.data),
                'priority_distribution': priority_counts,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error updating property priorities: {str(e)}")
            return {'error': str(e)}

    async def get_next_priority_properties(self, agent_type: str = None, limit: int = 10) -> List[Dict]:
        """
        Get next properties to process based on priority

        Args:
            agent_type: Filter by agent type ('discovery', 'rental_vision', 'rental_claude')
            limit: Maximum number of properties to return

        Returns:
            List of prioritized properties
        """
        if not self.supabase:
            logger.warning("Supabase client not available")
            return []

        try:
            # Build query for available properties
            query = self.supabase.table('properties_basic').select('*')

            # Order by priority (high -> medium -> low)
            query = query.order('priority_level', desc=True)
            query = query.order('created_at', desc=False)  # FIFO within priority

            if limit:
                query = query.limit(limit)

            result = query.execute()
            return result.data or []

        except Exception as e:
            logger.error(f"Error getting priority properties: {str(e)}")
            return []

    async def get_processing_queue_status(self) -> Dict:
        """
        Get current processing queue status and statistics

        Returns:
            Queue status summary
        """
        if not self.supabase:
            return {'error': 'Supabase not configured'}

        try:
            # Get property counts by priority
            priority_result = self.supabase.table('properties_basic').select(
                'priority_level'
            ).execute()

            # Get agent queue status
            queue_result = self.supabase.table('agent_processing_queue').select(
                'status'
            ).execute()

            # Calculate priority distribution manually
            priority_dist = {'high': 0, 'medium': 0, 'low': 0}
            for row in priority_result.data or []:
                priority_dist[row['priority_level']] = priority_dist.get(row['priority_level'], 0) + 1

            # Calculate queue status manually
            queue_status = {'pending': 0, 'processing': 0, 'completed': 0, 'failed': 0}
            for row in queue_result.data or []:
                queue_status[row['status']] = queue_status.get(row['status'], 0) + 1

            return {
                'priority_distribution': priority_dist,
                'queue_status': queue_status,
                'total_properties': sum(priority_dist.values()),
                'queued_jobs': sum(queue_status.values()),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error getting queue status: {str(e)}")
            return {'error': str(e)}

    def get_priority_thresholds(self) -> Dict:
        """Get current priority scoring thresholds"""
        return {
            'weights': self.weights,
            'thresholds': self.thresholds,
            'luxury_keywords': self.luxury_keywords[:5],  # First 5 for brevity
            'major_companies': self.major_management_companies[:5],  # First 5 for brevity
            'high_demand_cities': self.high_demand_cities[:5]  # First 5 for brevity
        }

    def update_priority_weights(self, new_weights: Dict) -> bool:
        """
        Update priority scoring weights

        Args:
            new_weights: Dictionary with new weights for each factor

        Returns:
            Success status
        """
        try:
            # Validate weights sum to 1.0
            total = sum(new_weights.values())
            if abs(total - 1.0) > 0.01:
                logger.error(f"Weights must sum to 1.0, got {total}")
                return False

            # Validate all required keys exist
            required_keys = set(self.weights.keys())
            provided_keys = set(new_weights.keys())

            if required_keys != provided_keys:
                missing = required_keys - provided_keys
                extra = provided_keys - required_keys
                logger.error(f"Weight keys mismatch. Missing: {missing}, Extra: {extra}")
                return False

            self.weights = new_weights
            logger.info(f"Updated priority weights: {new_weights}")
            return True

        except Exception as e:
            logger.error(f"Error updating priority weights: {str(e)}")
            return False


# Example usage and testing functions
async def test_priority_system():
    """Test the priority system with sample data"""
    print("🧪 Testing Priority System")
    print("=" * 40)

    system = PrioritySystem()

    # Test properties with different characteristics
    test_properties = [
        {
            'name': 'Luxury High-Rise Downtown',
            'total_units': 350,
            'property_type': 'luxury high-rise',
            'management_company': 'CBRE',
            'website_complexity': 'complex',
            'city': 'Atlanta'
        },
        {
            'name': 'Standard Garden Apartments',
            'total_units': 80,
            'property_type': 'garden',
            'management_company': 'Local Management',
            'website_complexity': 'simple',
            'city': 'Suburb'
        },
        {
            'name': 'Mid-Rise Premium',
            'total_units': 150,
            'property_type': 'mid-rise',
            'management_company': 'Greystar',
            'website_complexity': 'medium',
            'city': 'Nashville'
        }
    ]

    for prop in test_properties:
        score = system.calculate_priority_score(prop)
        print(f"\n🏢 {prop['name']}")
        print(f"📊 Total Score: {score.total_score:.2f}")
        print(f"🏢 Unit Count: {score.unit_count_score:.2f}")
        print(f"⭐ Property Type: {score.property_type_score:.2f}")
        print(f"👔 Management: {score.management_score:.2f}")
        print(f"🕸️  Complexity: {score.complexity_score:.2f}")
        print(f"📍 Location: {score.location_score:.2f}")
        print(f"🎯 Priority Level: {score.priority_level.upper()}")

    print(f"\n✅ Priority system test complete")

if __name__ == "__main__":
    asyncio.run(test_priority_system())