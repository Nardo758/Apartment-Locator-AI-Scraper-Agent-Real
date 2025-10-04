Robust JS Interactor (element_interaction.js)

Purpose
- Provides RobustElementInteractor for in-page interactions (wait/retry, recovery, action diagnostics).
- Exposes interactDetailed(...) that returns which selector matched, action type (modal vs navigation), modal HTML, data-* attributes, etc.

Usage (Node)
- Use `agents/playwright_interactor.js` or `agents/capture-huntley-interactor.js` to inject `agents/element_interaction.js` into a Playwright `page` and call methods.
- Example (in script):
  - await page.addScriptTag({ path: 'agents/element_interaction.js' });
  - await page.evaluate(async () => {
      const interactor = new window.RobustElementInteractor({ timeout: 15000, logging: true });
      return await interactor.interactDetailed('div[id^="fp-container-"]', ['a.track-apply','a.floorplan-action-button'], 'click');
    });

Usage (Python)
- Use `agents/playwright_js_interactor.py` to call the interactor from Python.
- Example (sync):
  - from playwright_js_interactor import interact_detailed_sync
  - result = interact_detailed_sync(url, 'div[id^="fp-container-"]', ['a.track-apply','a.floorplan-action-button'], headless=False)

Artifacts
- Node capture script wrote screenshots, videos and JSON to `agents/capture/`.
- Python interactor returns a JSON-like dict; `huntley_relational_scraper.py` saves combined results to `huntley_relational_scraping_<timestamp>.json`.

Notes
- The interactor may match elements that open modals (href=javascript:void(0)). When that happens, use the returned `modalHtml` to extract availability/contact links.
- Prefer anchors with real hrefs (relative '/floorplans/...' or absolute URLs) when available.

Security
- Do not automatically follow third-party links without explicit instruction. The interactor returns hrefs for you to decide whether to follow them.
