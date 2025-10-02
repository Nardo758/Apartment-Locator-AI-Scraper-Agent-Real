# template_manager.py
"""
Template Detection & Memory System for apartment website scraping.
Manages template detection, learning, and persistent storage of successful scraping patterns.
"""

import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Tuple, Optional
from urllib.parse import urlparse

from website_templates import WEBSITE_TEMPLATES, ONE_OFF_TEMPLATES, update_template_success


class TemplateManager:
    """
    Manages template detection, learning, and storage for apartment website scraping.
    Provides intelligent template matching and memorization of successful scraping paths.
    """

    def __init__(self, storage_file: str = "scraping_templates.json"):
        """
        Initialize the template manager.

        Args:
            storage_file: Path to JSON file for storing learned templates
        """
        self.storage_file = Path(__file__).parent / storage_file
        self.learned_templates = self._load_templates()
        self.template_stats = self._load_template_stats()

    def _load_templates(self) -> Dict[str, Any]:
        """Load learned templates from storage file."""
        if self.storage_file.exists():
            try:
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"⚠️  Warning: Could not load templates from {self.storage_file}: {e}")
                return {}
        return {}

    def _save_templates(self):
        """Save learned templates to storage file."""
        try:
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(self.learned_templates, f, indent=2, ensure_ascii=False)
            print(f"💾 Saved {len(self.learned_templates)} learned templates")
        except IOError as e:
            print(f"❌ Error saving templates: {e}")

    def _load_template_stats(self) -> Dict[str, Any]:
        """Load template success statistics."""
        stats_file = self.storage_file.parent / "template_stats.json"
        if stats_file.exists():
            try:
                with open(stats_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {}

    def _save_template_stats(self):
        """Save template success statistics."""
        stats_file = self.storage_file.parent / "template_stats.json"
        try:
            with open(stats_file, 'w', encoding='utf-8') as f:
                json.dump(self.template_stats, f, indent=2)
        except IOError as e:
            print(f"❌ Error saving template stats: {e}")

    def detect_template(self, url: str, page_content: str = "") -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Detect which template to use for a URL.

        Args:
            url: The URL to detect template for
            page_content: Optional page content for content-based matching

        Returns:
            Tuple of (template_dict, template_type) where template_type is
            'one_off', 'learned', template_name, or 'unknown'
        """
        domain = self._extract_domain(url)
        normalized_domain = domain.replace('www.', '')  # Normalize domain

        # 1. Check one-off templates first (highest priority)
        if normalized_domain in ONE_OFF_TEMPLATES:
            print(f"🎯 Found one-off template for {normalized_domain}")
            return ONE_OFF_TEMPLATES[normalized_domain], "one_off"

        # 2. Check learned templates (second priority)
        if normalized_domain in self.learned_templates:
            print(f"🎯 Found learned template for {normalized_domain}")
            return self.learned_templates[normalized_domain], "learned"

        # 3. Check main templates by pattern matching
        for template_name, template in WEBSITE_TEMPLATES.items():
            if self._matches_template(normalized_domain, page_content, template):
                print(f"🎯 Matched {template_name} template for {normalized_domain}")
                return template, template_name

        # 4. No match found
        print(f"🔍 No template match found for {normalized_domain}, will need to discover")
        return None, "unknown"

    def _matches_template(self, domain: str, content: str, template: Dict[str, Any]) -> bool:
        """
        Check if domain/content matches a template.

        Args:
            domain: Domain name
            content: Page content (lowercased)
            template: Template definition

        Returns:
            True if template matches
        """
        content_lower = content.lower()

        # Check domain patterns
        for pattern in template["identifiers"]["domain_patterns"]:
            # Remove leading dot from pattern for matching
            clean_pattern = pattern.lstrip('.')
            if clean_pattern in domain:
                return True

        # Check content indicators (only if we have content)
        if content:
            for indicator in template["identifiers"]["content_indicators"]:
                if indicator.lower() in content_lower:
                    return True

        return False

    def learn_new_template(self, url: str, successful_selectors: Dict[str, Any],
                          success_rate: float = 1.0):
        """
        Learn and save successful scraping path for a domain.

        Args:
            url: The URL that was successfully scraped
            successful_selectors: Dictionary of selectors that worked
            success_rate: Success rate (0.0 to 1.0)
        """
        domain = self._extract_domain(url)
        normalized_domain = domain.replace('www.', '')  # Normalize domain

        # Create learned template
        learned_template = {
            "learned_at": datetime.now().isoformat(),
            "url": url,
            "selectors": successful_selectors,
            "success_rate": success_rate,
            "usage_count": 1,
            "last_used": datetime.now().isoformat()
        }

        # Update or create learned template
        if normalized_domain in self.learned_templates:
            # Update existing template
            existing = self.learned_templates[normalized_domain]
            existing["usage_count"] = existing.get("usage_count", 0) + 1
            existing["last_used"] = datetime.now().isoformat()
            existing["success_rate"] = (existing.get("success_rate", 0.0) + success_rate) / 2
            existing["selectors"].update(successful_selectors)  # Merge selectors
        else:
            # Create new template
            self.learned_templates[normalized_domain] = learned_template

        self._save_templates()
        print(f"✅ Learned new template for {normalized_domain} (success rate: {success_rate:.2f})")

    def update_template_success(self, domain: str, success: bool):
        """
        Update success statistics for a domain's template.

        Args:
            domain: Domain name
            success: Whether the scraping was successful
        """
        normalized_domain = domain.replace('www.', '')  # Normalize domain

        if normalized_domain in self.learned_templates:
            template = self.learned_templates[normalized_domain]
            template["usage_count"] = template.get("usage_count", 0) + 1
            template["last_used"] = datetime.now().isoformat()

            # Update success rate (rolling average)
            current_rate = template.get("success_rate", 1.0)
            template["success_rate"] = (current_rate + (1.0 if success else 0.0)) / 2

            self._save_templates()

    def get_template_stats(self) -> Dict[str, Any]:
        """Get statistics about template usage and success rates."""
        stats = {
            "total_learned_templates": len(self.learned_templates),
            "template_usage": {},
            "success_rates": {}
        }

        for domain, template in self.learned_templates.items():
            stats["template_usage"][domain] = template.get("usage_count", 0)
            stats["success_rates"][domain] = template.get("success_rate", 0.0)

        return stats

    def cleanup_old_templates(self, days_old: int = 90):
        """
        Remove templates that haven't been used recently.

        Args:
            days_old: Remove templates older than this many days
        """
        cutoff_date = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
        domains_to_remove = []

        for domain, template in self.learned_templates.items():
            last_used = template.get("last_used")
            if last_used:
                try:
                    last_used_ts = datetime.fromisoformat(last_used).timestamp()
                    if last_used_ts < cutoff_date:
                        domains_to_remove.append(domain)
                except ValueError:
                    # Invalid date format, keep template
                    pass

        for domain in domains_to_remove:
            del self.learned_templates[domain]

        if domains_to_remove:
            self._save_templates()
            print(f"🧹 Cleaned up {len(domains_to_remove)} old templates")

    def export_templates(self, filepath: str):
        """Export all templates to a JSON file."""
        export_data = {
            "exported_at": datetime.now().isoformat(),
            "main_templates": WEBSITE_TEMPLATES,
            "one_off_templates": ONE_OFF_TEMPLATES,
            "learned_templates": self.learned_templates,
            "stats": self.get_template_stats()
        }

        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            print(f"📤 Exported templates to {filepath}")
        except IOError as e:
            print(f"❌ Error exporting templates: {e}")

    def import_templates(self, filepath: str):
        """Import templates from a JSON file."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if "learned_templates" in data:
                self.learned_templates.update(data["learned_templates"])
                self._save_templates()
                print(f"📥 Imported {len(data['learned_templates'])} learned templates")

        except (IOError, json.JSONDecodeError) as e:
            print(f"❌ Error importing templates: {e}")

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            # Fallback: try to extract domain manually
            match = re.search(r'https?://([^/]+)', url)
            return match.group(1) if match else url

    def get_similar_domains(self, domain: str) -> list:
        """Find domains with similar patterns for template suggestions."""
        similar = []
        domain_parts = domain.split('.')

        for learned_domain in self.learned_templates.keys():
            learned_parts = learned_domain.split('.')
            # Check if they share common parts (e.g., same TLD, similar structure)
            if (len(domain_parts) == len(learned_parts) and
                domain_parts[-1] == learned_parts[-1]):  # Same TLD
                similar.append(learned_domain)

        return similar