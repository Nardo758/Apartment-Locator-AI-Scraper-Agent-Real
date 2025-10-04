# website_templates.py
"""
Template-based scraping system for apartment websites.
Defines common patterns and selectors for different apartment website platforms.
"""

from typing import Dict, List, Any

# Main website templates for common apartment platforms
WEBSITE_TEMPLATES = {
    # Template 1: RealPage/AppFolio style
    "realpage": {
        "identifiers": {
            "domain_patterns": [".realpage.com", ".appfolio.com", ".myapartment.com"],
            "content_indicators": ["floorplans", "availability", "units", "apply now"]
        },
        "navigation": {
            "cookie_selectors": ["#cookie-consent", ".cookie-notice", ".gdpr-banner", "#gdpr-modal"],
            "floorplan_selector": "a[href*='floorplans'], a[href*='floor-plans'], nav a:has-text('Floor Plans')",
            "unit_selector": ".unit-card:first-child, [data-unit]:first-of-type, .unit-item:first-child",
            "price_selector": ".price, .rent, .pricing, .monthly-price",
            "bedbath_selector": ".details, .specs, .bed-bath, .unit-details",
            "lease_term_selector": ".lease-term, .term, .lease-options"
        },
        "behavior": {
            "wait_for_network_idle": True,
            "scroll_before_click": True,
            "timeout": 30000,
            "human_like_delays": True
        }
    },

    # Template 2: Yardi style
    "yardi": {
        "identifiers": {
            "domain_patterns": [".yardi.com", ".rentcafe.com", ".yardiapp.com"],
            "content_indicators": ["pricing", "floor plans", "apply now", "schedule tour"]
        },
        "navigation": {
            "cookie_selectors": [".cc-banner", "#gdpr-modal", ".cookie-consent", "#cookie-notice"],
            "floorplan_selector": "nav a:has-text('Floor Plans'), a[href*='floorplans'], .floorplan-link",
            "unit_selector": "[data-unit]:first-of-type, .unit-card:first-child, .apartment-unit:first-child",
            "price_selector": ".pricing, .price, .rent-amount, .monthly-rent",
            "bedbath_selector": ".specs, .unit-specs, .bed-bath-info",
            "lease_term_selector": ".lease-options, .term-options, .lease-terms"
        },
        "behavior": {
            "wait_for_network_idle": True,
            "scroll_before_click": False,
            "timeout": 25000,
            "human_like_delays": True
        }
    },

    # Template 3: WordPress/Generic style
    "wordpress": {
        "identifiers": {
            "domain_patterns": [],  # Match by content
            "content_indicators": ["wp-content", "themes", "apartments", "floor plans", "rentals"]
        },
        "navigation": {
            "cookie_selectors": [".cookie-law-info", "#cookie-notice", ".gdpr-consent", "#gdpr-banner"],
            "floorplan_selector": "a:has-text('Floor Plans'), a[href*='floorplans'], .floorplan-link",
            "unit_selector": ".apartment:first-child, .unit:first-child, .property-unit:first-child",
            "price_selector": ".rent, .price, .monthly-price, .rental-price",
            "bedbath_selector": ".bed-bath, .unit-details, .specs",
            "lease_term_selector": ".lease-term, .term, .lease-options"
        },
        "behavior": {
            "wait_for_network_idle": False,
            "scroll_before_click": True,
            "timeout": 20000,
            "human_like_delays": False
        }
    },

    # Template 4: Entrata style
    "entrata": {
        "identifiers": {
            "domain_patterns": [".entrata.com", ".leasing.com"],
            "content_indicators": ["floorplans", "availability", "resident portal", "apply online"]
        },
        "navigation": {
            "cookie_selectors": [".cookie-banner", "#cookie-consent", ".gdpr-modal"],
            "floorplan_selector": "a[href*='floorplans'], nav a:has-text('Floor Plans')",
            "unit_selector": ".unit-card:first-child, [data-unit]:first-of-type",
            "price_selector": ".price, .rent, .pricing-info",
            "bedbath_selector": ".unit-details, .specs, .bed-bath",
            "lease_term_selector": ".lease-options, .term-selection"
        },
        "behavior": {
            "wait_for_network_idle": True,
            "scroll_before_click": True,
            "timeout": 35000,
            "human_like_delays": True
        }
    },

    # Template 5: Buildium/Propertyware style
    "buildium": {
        "identifiers": {
            "domain_patterns": [".buildium.com", ".propertyware.com"],
            "content_indicators": ["floor plans", "availability", "apply", "rent"]
        },
        "navigation": {
            "cookie_selectors": [".cookie-notice", "#gdpr-consent", ".privacy-banner"],
            "floorplan_selector": "a:has-text('Floor Plans'), a[href*='floorplans']",
            "unit_selector": ".unit-listing:first-child, .apartment-unit:first-child",
            "price_selector": ".rent-price, .monthly-rent, .price",
            "bedbath_selector": ".unit-info, .bed-bath, .specs",
            "lease_term_selector": ".lease-term, .term-options"
        },
        "behavior": {
            "wait_for_network_idle": False,
            "scroll_before_click": False,
            "timeout": 20000,
            "human_like_delays": False
        }
    },

    # Template 6: Custom/Generic apartment sites
    "generic": {
        "identifiers": {
            "domain_patterns": [],  # Fallback template
            "content_indicators": ["apartments", "rent", "lease", "floor plan"]
        },
        "navigation": {
            "cookie_selectors": [
                "button[class*='close']", "text=X", ".cookie-close", "#close-cookies",
                "[aria-label*='close']", ".cookie-accept", "#accept-cookies",
                ".gdpr-accept", "#gdpr-accept"
            ],
            "floorplan_selector": "a:has-text('Floor Plans'), a:has-text('Floorplans'), a[href*='floorplan']",
            "unit_selector": ".unit:first-child, .apartment:first-child, .listing:first-child",
            "price_selector": ".price, .rent, .cost, .monthly",
            "bedbath_selector": ".details, .info, .specs, .bedroom",
            "lease_term_selector": ".lease, .term, .duration"
        },
        "behavior": {
            "wait_for_network_idle": False,
            "scroll_before_click": True,
            "timeout": 15000,
            "human_like_delays": True
        }
    }
}

# One-off templates for specific domains that don't fit main templates
ONE_OFF_TEMPLATES = {
    "altaporter.com": {
        "navigation": {
            "cookie_selectors": ["button[class*='close']", "text=X", "[aria-label*='close']"],
            "floorplan_selector": "header a.header__button[href*='floorplans']:has-text('Find Your Home')",
            "unit_selector": "[data-unit]:nth-of-type(1), .unit-card:first-child, .floorplan-item:first-child",
            "price_selector": ".rent-price, .price, .monthly-rent, .pricing",
            "bedbath_selector": ".unit-details, .specs, .bed-bath, .floorplan-details",
            "lease_term_selector": ".lease-options, .term, .lease-terms"
        },
        "special_notes": "Use header 'Find Your Home' button specifically. Multiple floorplan links exist, prioritize header button",
        "behavior": {
            "wait_for_network_idle": True,
            "scroll_before_click": True,
            "timeout": 30000
        }
    },

    "example-property.com": {
        "cookie_selectors": ["#accept-cookies", ".cookie-accept"],
        "floorplan_selector": ".floorplan-link, a[href*='floorplans']",
        "unit_selector": ".unit-item:first-child, .apartment:first-child",
        "price_selector": ".rent-amount, .price",
        "bedbath_selector": ".unit-specs, .details",
        "lease_term_selector": ".lease-term",
        "behavior": {
            "wait_for_network_idle": False,
            "scroll_before_click": False,
            "timeout": 20000
        }
    }
}

# Success tracking for templates
TEMPLATE_SUCCESS_RATES = {
    "realpage": {"success_count": 0, "total_attempts": 0, "success_rate": 0.0},
    "yardi": {"success_count": 0, "total_attempts": 0, "success_rate": 0.0},
    "wordpress": {"success_count": 0, "total_attempts": 0, "success_rate": 0.0},
    "entrata": {"success_count": 0, "total_attempts": 0, "success_rate": 0.0},
    "buildium": {"success_count": 0, "total_attempts": 0, "success_rate": 0.0},
    "generic": {"success_count": 0, "total_attempts": 0, "success_rate": 0.0}
}

def update_template_success(template_name: str, success: bool):
    """Update success rates for templates"""
    if template_name in TEMPLATE_SUCCESS_RATES:
        TEMPLATE_SUCCESS_RATES[template_name]["total_attempts"] += 1
        if success:
            TEMPLATE_SUCCESS_RATES[template_name]["success_count"] += 1

        total = TEMPLATE_SUCCESS_RATES[template_name]["total_attempts"]
        success_count = TEMPLATE_SUCCESS_RATES[template_name]["success_count"]
        TEMPLATE_SUCCESS_RATES[template_name]["success_rate"] = success_count / total if total > 0 else 0.0

def get_best_template() -> str:
    """Get the template with highest success rate"""
    best_template = max(TEMPLATE_SUCCESS_RATES.items(),
                       key=lambda x: x[1]["success_rate"])
    return best_template[0] if best_template[1]["total_attempts"] > 0 else "generic"