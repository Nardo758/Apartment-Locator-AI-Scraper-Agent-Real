from playwright_js_interactor import interact_detailed_sync
import json

if __name__ == '__main__':
    url = 'https://www.thehuntley.com/floorplans'
    container = 'div[id^="fp-container-"]'
    selectors = ['a.track-apply','a.floorplan-action-button','a[data-selenium-id^="floorplan-"]','a.btn-primary']
    print('Running helper against', url)
    r = interact_detailed_sync(url, container, selectors, headless=False)
    print(json.dumps(r, indent=2)[:2000])
