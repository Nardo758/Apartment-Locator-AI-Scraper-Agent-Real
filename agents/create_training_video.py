import asyncio
import json
import os
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
VIDEOS_DIR = ROOT / 'videos'
RESULTS_DIR = ROOT / 'batch_results'
INTERACTOR_PATH = ROOT / 'element_interaction.js'


def ensure_dirs():
    VIDEOS_DIR.mkdir(exist_ok=True)
    RESULTS_DIR.mkdir(exist_ok=True)


def load_interactor_source():
    return INTERACTOR_PATH.read_text(encoding='utf-8')


def run_demo(url: str, timeout: int = 30_000):
    ensure_dirs()
    timestamp = int(time.time())
    video_path = VIDEOS_DIR / f"training_{timestamp}.webm"
    result_path = RESULTS_DIR / f"training_{timestamp}.json"

    interactor_src = load_interactor_source()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(record_video_dir=str(VIDEOS_DIR))
        page = context.new_page()
        try:
            print(f"Navigating to {url}...")
            page.goto(url, timeout=timeout)

            # small wait for dynamic content
            page.wait_for_timeout(1500)

            # inject interactor into future navigations and current page
            print("Injecting interactor script...")
            try:
                page.add_init_script(interactor_src)
            except Exception:
                # add_init_script may fail on some playwright versions; ignore
                pass
            # ensure it's available in the current page
            page.add_script_tag(content=interactor_src)
            # quick check
            page.evaluate("() => !!(window.RobustElementInteractor)")

            # prepare simple selectors to try
            container = 'body'
            selectors = [
                'a[href*=apply]',
                'a[href*=availability]',
                'button:has-text("Apply" )',
                'button:has-text("Floor Plan" )',
                'button:has-text("Availability" )',
                '.floorplan, .floor-plan, [data-floor]'
            ]

            # call interactDetailed via page.evaluate
            print("Calling interactDetailed in page context...")
            res = page.evaluate('''(opts) => {
                try {
                    const r = new window.RobustElementInteractor({ timeout: 8000, logging: true });
                    return r.interactDetailed(opts.container, opts.selectors, 'click');
                } catch (e) {
                    return { ok: false, error: String(e) };
                }
            }''', { 'container': container, 'selectors': selectors })

            # give time for video to capture post-click
            page.wait_for_timeout(1500)

            # capture final page state: url, html, and screenshot
            final_url = page.url
            try:
                final_html = page.content()
            except Exception:
                final_html = None

            screenshot_path = RESULTS_DIR / f"training_{timestamp}.png"
            try:
                page.screenshot(path=str(screenshot_path), full_page=True)
            except Exception:
                screenshot_path = None

            # close browser to flush video file
            browser.close()

            # pick newest file in VIDEOS_DIR
            vids = sorted(VIDEOS_DIR.glob('*.webm'), key=lambda p: p.stat().st_mtime, reverse=True)
            vid_file = str(vids[0].resolve()) if vids else None

            out = {
                'requested_url': url,
                'timestamp': timestamp,
                'result': res,
                'video': vid_file,
                'final_url': final_url,
                'final_html_saved': bool(final_html),
                'screenshot': str(screenshot_path.resolve()) if screenshot_path else None,
            }

            print(f"Saving result to {result_path}")
            result_path.write_text(json.dumps(out, indent=2), encoding='utf-8')
            print("Done.")
            return out

        except Exception as e:
            try:
                browser.close()
            except Exception:
                pass
            raise


if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print('Usage: python create_training_video.py <url>')
        sys.exit(1)
    url = sys.argv[1]
    out = run_demo(url)
    print(json.dumps(out, indent=2))
