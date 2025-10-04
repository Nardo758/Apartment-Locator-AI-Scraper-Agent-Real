# Rental Scraper Navigator - Browser Extension

A Chrome extension that records user navigation patterns on rental websites to teach scraping systems how to navigate complex rental platforms.

## Features

- **Automatic Detection**: Auto-starts recording on known rental websites
- **Action Recording**: Captures clicks, form submissions, and navigation
- **Smart Selectors**: Generates unique CSS selectors for elements
- **Session Management**: Save, export, and manage recorded sessions
- **Real-time Feedback**: See actions as they're recorded

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this `browser-extension` folder
4. The extension should now appear in your extensions list

## Usage

### Recording Navigation

1. Navigate to a rental website (like apartments.com, zillow.com, etc.)
2. Click the extension icon in the toolbar
3. Click "Start Recording"
4. Navigate the website as you normally would to find rental information
5. Click "Stop Recording" when done

### Managing Sessions

- **View Sessions**: See all saved recording sessions
- **Export Session**: Download session data as JSON for use with the learning system
- **Delete Session**: Remove unwanted sessions

## Recorded Actions

The extension records these types of interactions:

- **Clicks**: Button clicks, link clicks, element interactions
- **Form Submissions**: When forms are submitted
- **Input Changes**: Text input, dropdown selections
- **Navigation**: Page changes and URL updates

## Data Format

Exported sessions contain:

```json
{
  "sessionId": "session_1234567890",
  "url": "https://www.apartments.com/",
  "startTime": 1234567890000,
  "endTime": 1234567900000,
  "duration": 10000,
  "actions": [
    {
      "type": "click",
      "selector": "a[href*='floorplans']",
      "timestamp": 1234567891000,
      "url": "https://www.apartments.com/",
      "elementText": "Floor Plans",
      "x": 150,
      "y": 200
    }
  ],
  "metadata": {
    "exportedAt": 1234567900000,
    "exportedBy": "Rental Scraper Navigator",
    "version": "1.0"
  }
}
```

## Integration with Learning System

The exported JSON files can be used with the Python learning system:

```python
from learning_system import PlaybackLearner

learner = PlaybackLearner()
with open('rental_scraper_session_1234567890.json', 'r') as f:
    session_data = json.load(f)

patterns = learner.parse_playwright_recording_from_session(session_data)
learned_path = learner.learn_from_session_data(session_data)
```

## Permissions

The extension requires these permissions:

- `activeTab`: To interact with the current tab
- `storage`: To save recorded sessions locally
- `downloads`: To export session data as files

## Development

### File Structure

```
browser-extension/
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── content-script.js     # Page interaction recording
├── background.js         # Background service worker
└── README.md            # This file
```

### Adding New Rental Domains

Edit the `rentalDomains` array in `content-script.js` to add more domains for auto-detection:

```javascript
const rentalDomains = [
    'apartments.com', 'zillow.com', 'realtor.com',
    'your-new-domain.com'  // Add your domain here
];
```

## Troubleshooting

### Extension Not Recording

- Make sure you're on a webpage (not chrome:// pages)
- Check that the content script loaded (look for console messages)
- Try refreshing the page

### Actions Not Being Recorded

- Some websites use shadow DOM or iframes that may block recording
- Check browser console for error messages
- Try recording on a simpler website first

### Export Not Working

- Check that you have download permissions enabled
- Look for the downloaded file in your Downloads folder

## Contributing

1. Test your changes on multiple rental websites
2. Ensure selector generation works reliably
3. Add proper error handling
4. Update this README with any new features

## License

This project is part of the Apartment Locator AI Scraper system.