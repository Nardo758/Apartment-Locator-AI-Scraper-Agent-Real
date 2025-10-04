This folder contains a small recorder for creating training traces for a visual navigation model (Anthropic Visual AI).

Files:
- record_interactions.py - recorder class that writes JSONL lines for each interaction step.
- run_and_record.py - a small runner that will kick off a headful validation and is intended to be extended to record actions.

JSONL record fields:
- session_id: unique session identifier
- step: integer step index
- timestamp: UTC timestamp
- action_type: 'anchor_click' | 'hover' | 'click' | 'screenshot' | 'navigate'
- page_url: URL at time of action
- selector: dict with selector type and expression
- screenshot: path to saved screenshot
- page_html: path or HTML snippet saved (trimmed)
- visible_text: OCR/extracted visible text tokens (trimmed to 8k chars)
- extra: optional metadata

Goal: produce high-quality traces from real headful runs (visible browser) that show step-by-step navigation toward pages with floor plans, amenities, pricing, fees, and concessions. These JSONL traces can be used as few-shot examples or to fine-tune a navigation policy for Anthropic Visual AI.
