from playwright_js_interactor import interact_detailed_sync
import json

url = 'https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center/floorplans'
print('Running interact_detailed_sync on', url)
res = interact_detailed_sync(url, 'body', ['a.track-apply','a.floorplan-action-button','a[data-selenium-id^="floorplan-"]','a.btn-primary','a[href*="apply"]'], headless=False)
print(json.dumps(res, indent=2))
