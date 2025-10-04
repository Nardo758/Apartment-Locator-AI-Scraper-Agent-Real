import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

THIS_DIR = Path(__file__).resolve().parent
ELEMENT_JS = THIS_DIR / 'element_interaction.js'

async def interact_detailed(url: str, container_selector: str, element_selectors: list, action: str = 'click', timeout: int = 15000, headless: bool = True):
    """Launch Playwright, navigate to url, inject element_interaction.js, and call interactDetailed.

    Returns a dict with the result or raises on navigation/load errors.
    """
    if not ELEMENT_JS.exists():
        raise FileNotFoundError(f"Missing {ELEMENT_JS}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(viewport={'width':1366,'height':900})
        page = await context.new_page()
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=20000)

            # Best-effort close overlays
            try:
                await page.evaluate("""
                () => {
                    ['#acsBtn', '#acsClose', '.close.acs-Close', '#acsOptions button.close', '#rl-email-container', '#rl-email'].forEach(s => {
                        const el = document.querySelector(s);
                        if (el && el.click) try { el.click(); } catch(e) {}
                        if (el && el.remove) try { el.remove(); } catch(e) {}
                    });
                }
                """)
            except Exception:
                pass

            # inject the interactor JS
            await page.add_script_tag(path=str(ELEMENT_JS))

            # repeated scrolls to encourage lazy-load
            for _ in range(6):
                await page.evaluate("window.scrollBy(0, window.innerHeight * 0.6)")
                await page.wait_for_timeout(300)

            # try waiting for selector; if it times out, fall back to evaluating DOM directly
            try:
                await page.wait_for_selector(container_selector, timeout=timeout)
            except Exception:
                # fallback: try to find a matching element via evaluate (more tolerant to CSS parsing differences)
                found_id = await page.evaluate("""
                    (sel) => {
                        try {
                            const el = document.querySelector(sel);
                            return el ? el.id || true : null;
                        } catch (e) {
                            // if selector syntax caused issues, try a simpler pattern
                            const els = Array.from(document.querySelectorAll('div')).filter(d => d.id && d.id.indexOf('fp-container')===0);
                            return els.length ? (els[0].id || true) : null;
                        }
                    }
                """, container_selector)

                if not found_id:
                    raise TimeoutError(f"Container not found using selector: {container_selector}")

            # call interactDetailed inside page
            payload = { 'containerSelector': container_selector, 'selectors': element_selectors, 'action': action }
            result = await page.evaluate(
                """
                async (payload) => {
                    const { containerSelector, selectors, action } = payload;
                    if (!window.RobustElementInteractor) return { ok:false, reason:'interactor-missing' };
                    const interactor = new window.RobustElementInteractor({ timeout: 15000, logging: false });
                    if (typeof interactor.interactDetailed === 'function') {
                        return await interactor.interactDetailed(containerSelector, selectors, action);
                    }
                    const res = await interactor.interact(containerSelector, selectors, action);
                    const matched = selectors.find(s => document.querySelector(`${containerSelector} ${s}`));
                    const el = matched ? document.querySelector(`${containerSelector} ${matched}`) : null;
                    return { ok: !!res, res, matched, href: el ? el.getAttribute('href') : null };
                }
                """,
                payload,
            )

            return result
        finally:
            await context.close()
            await browser.close()


# quick sync wrapper
def interact_detailed_sync(url: str, container_selector: str, element_selectors: list, action: str = 'click', timeout: int = 15000, headless: bool = True):
    return asyncio.get_event_loop().run_until_complete(interact_detailed(url, container_selector, element_selectors, action, timeout, headless))


if __name__ == '__main__':
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else 'https://www.thehuntley.com/floorplans'
    print('Running interact_detailed against', url)
    r = interact_detailed_sync(url, 'div[id^="fp-container-"]', ['a.track-apply','a.floorplan-action-button','a[data-selenium-id^="floorplan-"]','a.btn-primary'])
    print(json.dumps(r, indent=2))
