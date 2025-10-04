const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log('🔎 Navigating to https://thehuntley.com/floorplans');
        await page.goto('https://thehuntley.com/floorplans', { waitUntil: 'networkidle' , timeout: 60000});

        const results = await page.evaluate(() => {
            // find candidate containers: div/section/article elements that contain at least one button or anchor
            const candidates = Array.from(document.querySelectorAll('div, section, article'))
                .map(el => {
                    const buttons = Array.from(el.querySelectorAll('button, a'));
                    return {
                        tag: el.tagName.toLowerCase(),
                        classes: el.className ? el.className.trim() : '',
                        id: el.id || null,
                        btnCount: buttons.length,
                        sampleButtons: buttons.slice(0,5).map(b => ({
                            tag: b.tagName,
                            text: b.textContent.trim().replace(/\s+/g,' '),
                            classes: b.className || '',
                            attrs: Array.from(b.attributes||[]).map(a=>({name:a.name,value:a.value}))
                        })),
                        outer: el.outerHTML.slice(0,1000)
                    };
                })
                .filter(c => c.btnCount > 0)
                .sort((a,b)=> b.btnCount - a.btnCount)
                .slice(0,40);

            return candidates;
        });

        console.log('📊 Found candidate containers (top 40):');
        console.log(JSON.stringify(results, null, 2));

    } catch (e) {
        console.error('Error during inspection:', e);
    } finally {
        await browser.close();
    }
})();
