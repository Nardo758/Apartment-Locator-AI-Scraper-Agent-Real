const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 50 });
    const page = await browser.newPage({
        viewport: { width: 1366, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });
    try {
        console.log('🔎 Navigating to https://www.thehuntley.com/floorplans (non-headless)');
        await page.goto('https://www.thehuntley.com/floorplans', { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(2000);

        const frameInfos = [];
        const frames = page.frames();
        for (const frame of frames) {
            try {
                const name = frame.name() || null;
                const url = frame.url();
                const candidates = await frame.evaluate(() => {
                    const nodes = Array.from(document.querySelectorAll('div, section, article'));
                    const results = nodes.map(el => {
                        const buttons = Array.from(el.querySelectorAll('button, a'));
                        return {
                            tag: el.tagName.toLowerCase(),
                            classes: el.className ? el.className.trim() : '',
                            id: el.id || null,
                            btnCount: buttons.length,
                            sampleButtons: buttons.slice(0,5).map(b => ({
                                tag: b.tagName,
                                text: (b.textContent||'').trim().replace(/\s+/g,' '),
                                classes: b.className || '',
                                attrs: Array.from(b.attributes||[]).map(a=>({name:a.name,value:a.value}))
                            })),
                            childCount: el.children.length
                        };
                    }).filter(c => c.btnCount > 0).sort((a,b) => b.btnCount - a.btnCount).slice(0,20);
                    return results;
                });

                frameInfos.push({ name, url, candidates });
            } catch (e) {
                frameInfos.push({ name: frame.name(), url: frame.url(), error: e.message });
            }
        }

        console.log('📊 Frame scan results:');
        console.log(JSON.stringify(frameInfos, null, 2));

        // Also output page HTML length and top-level snapshot
        const html = await page.content();
        console.log('🔢 Page HTML length:', html.length);

    } catch (e) {
        console.error('Error during frame inspection:', e);
    } finally {
        // keep browser open for manual inspection for a few seconds
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
