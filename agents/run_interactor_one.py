import sys
import json
from playwright_js_interactor import interact_detailed_sync

if len(sys.argv) < 2:
    print('Usage: python run_interactor_one.py <url> [headless]')
    sys.exit(1)

url = sys.argv[1]
headless = False
if len(sys.argv) > 2:
    headless = sys.argv[2].lower() in ('1','true','yes')

print('Running interactor on', url, 'headless=', headless)
res = interact_detailed_sync(url, 'body', ['a.track-apply','a.floorplan-action-button','a[data-selenium-id^="floorplan-"]','a.btn-primary','a[href*="apply"]'], headless=headless)
print(json.dumps(res, indent=2))
# save to file
from pathlib import Path
p = Path(__file__).parent / 'batch_results'
p.mkdir(exist_ok=True)
fn = p / (url.replace('https://','').replace('http://','').replace('/','_') + '.json')
with open(fn, 'w', encoding='utf-8') as f:
    json.dump({'url':url,'result':res}, f, indent=2)
print('Saved result to', fn)
