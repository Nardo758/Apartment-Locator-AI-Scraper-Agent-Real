# Apartment Locator AI Scraper Agent

A comprehensive apartment rental data scraping system with intelligent learning capabilities. The system can automatically learn navigation patterns from human demonstrations and adapt to different rental website structures.

## Features

## Usage

- python enhanced_scraper.py extract `https://www.apartments.com/example`

## Supabase push helper

If you want to push a saved scrape result to Supabase, use the helper script:

    python agents/push_scrape_to_supabase.py --file agents/live_results/<domain>/scrape_result.json --dry-run

To actually push, set these environment variables and omit --dry-run:

    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

The script will call the RPC `rpc_bulk_upsert_properties` by default. Modify the --rpc argument to change.
### Core Scraping Engine

- **Template-Based Scraping**: Intelligent platform detection with customizable templates
- **Universal Navigation Flow**: 3-step rental process (Floor Plans → Unit Selection → Pricing Details)
- **Multi-Stage Data Extraction**: Pricing details, unit information, and floorplan data
- **Human-Like Behavior**: Randomized timing and interactions to avoid detection
- **Supabase Integration**: Cloud database storage with real-time sync

### Watch and Learn System 🧠

- **Interactive Training**: Learn navigation patterns by watching human demonstrations
- **Browser Extension**: Chrome extension for recording user interactions
- **Playback Learning**: Parse and learn from Playwright codegen recordings
- **Human-in-the-Loop**: Request human guidance when automatic extraction fails
- **Session Management**: Save, export, and manage learned navigation paths

### Advanced Capabilities

- **Smart Selector Generation**: Automatically generates unique CSS selectors
- **Fallback Strategies**: Multiple extraction methods with intelligent retry logic
- **Error Recovery**: Comprehensive exception handling and logging
- **Batch Processing**: Process multiple URLs with progress tracking
- **Data Validation**: Built-in validation and cleaning of extracted data

## Project Structure

```text
apartment-scraper/
├── agents/                          # Python scraping agents
│   ├── rental_data_agent.py         # Main scraping agent
│   ├── smart_scraper.py             # Template-based scraper
│   ├── website_templates.py         # Template definitions
│   ├── template_manager.py          # Template management
│   ├── learning_system.py           # Watch and Learn system
│   ├── test_learning.py             # Learning system tests
│   └── scrape_specific_sites.py     # Batch processing utility
├── browser-extension/               # Chrome extension for recording
### Advanced Capabilities
│   ├── manifest.json               # Extension manifest
│   ├── popup.html                  # Extension UI
│   ├── popup.js                    # Popup functionality
│   ├── content-script.js           # Page interaction recording
│   ├── background.js               # Background service worker
│   └── README.md                   # Extension documentation
├── supabase/                       # Edge functions
│   └── functions/
│       └── ai-scraper-worker/
├── data/                           # Learned paths and sessions
│   └── learned_paths/              # Saved navigation patterns
├── enhanced_scraper.py             # Enhanced scraper with learning
├── requirements.txt                # Python dependencies
├── package.json                    # Node.js dependencies
├── deno.json                       # Deno configuration
└── README.md                       # This file
```

## Quick Start

# ### Basic Scraping

```bash
# Install dependencies
pip install -r requirements.txt

# Run basic scraper
cd agents
python scrape_specific_sites.py
```

# ### Watch and Learn Mode

```bash
# Start learning session
python enhanced_scraper.py learn https://www.apartments.com/example

# Extract with learning enabled
python enhanced_scraper.py extract https://www.apartments.com/example

# Interactive mode
python enhanced_scraper.py interactive
```

### Browser Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `browser-extension` folder
4. Navigate to a rental website and click the extension icon
5. Click "Start Recording" and demonstrate navigation
6. Export the session for use with the learning system

## Learning System Usage

### 1. Interactive Training

```python
from agents.learning_system import start_learning_session

# Start a learning session - opens browser for you to demonstrate
learned_path = await start_learning_session("https://www.apartments.com/example")
```

### 2. Enhanced Extraction

```python
from agents.learning_system import extract_with_learning

# Extract with learning capabilities
results = await extract_with_learning("https://www.apartments.com/example")
```

### 3. Human-in-the-Loop

```python
from agents.learning_system import LearningEnhancedRentalDataAgent

agent = LearningEnhancedRentalDataAgent()

# Will automatically request human help if extraction fails
results = await agent.extract_rental_data_with_learning(url, enable_learning=True)
```

### 4. Browser Extension Integration

1. Record a session using the Chrome extension
2. Export the session as JSON
3. Import into the learning system:
```python
from agents.learning_system import PlaybackLearner

learner = PlaybackLearner()
with open('session_export.json', 'r') as f:
    session_data = json.load(f)

learned_path = learner.learn_from_session_data(session_data)
```

## Configuration

### Environment Variables
```bash
# Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Learning system settings
LEARNING_AUTO_START=true
LEARNING_DATA_DIR=./data/learned_paths
```

### Template Configuration
Templates are defined in `agents/website_templates.py`. Add new templates:
```python
ONE_OFF_TEMPLATES = {
    "yoursite.com": {
        "navigation": {
            "floorplans": "header a[href*='floorplans']",
            "units": "[data-unit]",
            "apply": ".apply-btn"
        },
        "extraction": {
            "price": ".price",
            "bedrooms": ".beds",
            "bathrooms": ".baths"
        }
    }
}
```

## API Reference

### LearningEnhancedRentalDataAgent
- `extract_rental_data_with_learning(url, enable_learning=True)`: Extract with learning
- `start_learning_session(url)`: Start interactive learning
- `retry_with_guidance(url, selector)`: Retry with human-provided selector

### InteractiveTrainer
- `start_training_session(url)`: Begin training session
- `analyze_session(session_actions)`: Analyze recorded actions
- `test_learned_path(url, learned_path)`: Test learned navigation

### HumanFeedbackSystem
- `request_human_guidance(url, state, failed_selectors)`: Request human help
- `element_guidance(url)`: Guide user to click element
- `human_demonstration(url)`: Let user demonstrate navigation

## Browser Extension API

### Content Script Messages
- `START_RECORDING`: Begin recording session
- `STOP_RECORDING`: End recording and return actions
- `GET_STATUS`: Get current recording status
- `CLEAR_ACTIONS`: Clear recorded actions

### Background Script Messages
- `RECORDING_STARTED`: Session started
- `RECORDING_STOPPED`: Session ended with actions
- `ACTION_RECORDED`: Individual action recorded
- `GET_SESSIONS`: Retrieve saved sessions
- `EXPORT_SESSION`: Export session as JSON
- `DELETE_SESSION`: Remove session

## Troubleshooting

### Common Issues

**Learning sessions not starting**
- Ensure Playwright is installed: `pip install playwright`
- Run `playwright install` to install browser binaries

**Browser extension not recording**
- Check that content script loaded (console messages)
- Ensure you're on a webpage, not chrome:// pages
- Try refreshing the page

**Extraction failing**
- Enable learning mode for difficult sites
- Check template definitions in `website_templates.py`
- Use browser extension to record successful navigation

**Supabase connection issues**
- Verify environment variables are set
- Check Supabase project status
- Ensure proper permissions on tables

### Debug Mode
```bash
# Run with debug logging
python -c "import logging; logging.basicConfig(level=logging.DEBUG)"
python enhanced_scraper.py extract https://example.com
```

## Development

### Adding New Templates
1. Analyze the target website structure
2. Add template to `website_templates.py`
3. Test with `python test_learning.py extract <url>`
4. Use learning system for complex sites

### Extending the Learning System
1. Add new action types in `InteractiveTrainer`
2. Implement custom analysis in `analyze_session()`
3. Add new feedback types in `HumanFeedbackSystem`

### Testing
```bash
# Test learning system
python agents/test_learning.py demo

# Test enhanced scraper
python enhanced_scraper.py extract https://www.altaporter.com/

# Test batch processing
python enhanced_scraper.py batch urls.txt
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure learning system works with new features
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Security Note

This tool is for research and personal use only. Respect website terms of service and robots.txt files. Use responsibly and avoid overloading servers with requests.
