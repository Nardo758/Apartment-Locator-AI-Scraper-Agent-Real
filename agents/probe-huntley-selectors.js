const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    try {
        console.log('Navigating...');
        await page.goto('https://www.thehuntley.com/floorplans', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2000);

        const probes = [
            'div.fp-container',
            'a.floorplan-action-button',
            'a.track-apply',
            'a[data-selenium-id^="floorplan-"]',
            'a.btn-primary',
            '.card-body .track-apply'
        ];

        const results = {};
        for (const sel of probes) {
            try {
                const count = await page.evaluate((s) => document.querySelectorAll(s).length, sel);
                results[sel] = { count };
                if (count > 0) {
                    const sample = await page.evaluate((s) => {
                        return Array.from(document.querySelectorAll(s)).slice(0,3).map(el => ({ html: el.outerHTML.slice(0,400) }));
                    }, sel);
                    results[sel].sample = sample;
                }
            } catch (e) {
                results[sel] = { error: e.message };
            }
        }

        // Also search across frames
        const frameResults = [];
        for (const f of page.frames()) {
            try {
                const url = f.url();
                const frameRes = { url, counts: {} };
                for (const sel of probes) {
                    try {
                        const c = await f.evaluate((s) => document.querySelectorAll(s).length, sel);
                        frameRes.counts[sel] = c;
                    } catch (e) {
                        frameRes.counts[sel] = `err:${e.message}`;
                    }
                }
                frameResults.push(frameRes);
            } catch (e) {
                frameResults.push({ error: e.message });
            }
        }

        console.log('Probe results:', JSON.stringify(results, null, 2));
        console.log('Frame scan results:', JSON.stringify(frameResults, null, 2));

    } catch (e) {
        console.error('Probe failed:', e);
    } finally {
        await browser.close();
    }
})();
