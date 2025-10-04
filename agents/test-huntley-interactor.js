const { chromium } = require('playwright');
const path = require('path');

async function testHuntleyInteractor() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

    try {
        console.log('🚀 Navigating to The Huntley floorplans...');
        await page.goto('https://www.thehuntley.com/floorplans', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Close accessibility overlays if present
        try {
            await page.evaluate(() => {
                const selectors = ['#acsBtn', '#acsClose', '.close.acs-Close', '#acsOptions button.close', '#rl-email-container', '#rl-email'];
                selectors.forEach(s => {
                    const el = document.querySelector(s);
                    if (el && typeof el.click === 'function') try { el.click(); } catch(e) {}
                    if (el && typeof el.remove === 'function') try { el.remove(); } catch(e) {}
                });
            });
        } catch (e) { /* ignore overlay close errors */ }

        // Wait for floorplan container and scroll to trigger lazy load
        try {
            await page.waitForSelector('div[id^="fp-container-"]', { timeout: 20000 });
        } catch (e) {
            console.warn('No fp-container detected within timeout; proceeding to scroll and search');
        }

        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.6));
            await page.waitForTimeout(400);
        }

        const firstContainerId = await page.evaluate(() => {
            const el = document.querySelector('div[id^="fp-container-"]');
            return el ? el.id : null;
        });

        if (!firstContainerId) {
            throw new Error('No floorplan container found on page');
        }

        console.log('Found container:', firstContainerId);

        // Inject interactor
        console.log('💉 Injecting interactor...');
        const scriptPath = path.resolve(__dirname, 'element_interaction.js');
        await page.addScriptTag({ path: scriptPath });

        // Attempt robust click inside that container
        console.log('🎯 Performing robust click inside container...');
        let clickResult = null;
        try {
            clickResult = await page.evaluate(async (containerId) => {
                if (!window.RobustElementInteractor) throw new Error('RobustElementInteractor not available');
                const interactor = new window.RobustElementInteractor({ timeout: 15000, logging: true });
                return await interactor.interact(`#${containerId}`, ['a.track-apply', 'a.floorplan-action-button', 'a[data-selenium-id^="floorplan-"]', 'a.btn-primary'], 'click');
            }, firstContainerId);
        } catch (e) {
            console.warn('Interactor click error:', e && e.message ? e.message : e);
        }

        console.log('✅ Click result:', clickResult);

        // Gather a small page structure sample
        const pageStructure = await page.evaluate(() => {
            const containers = document.querySelectorAll('div[id^="fp-container-"], div.fp-container');
            return Array.from(containers).slice(0, 8).map(c => ({ id: c.id, classes: c.className, buttons: Array.from(c.querySelectorAll('a,button')).map(b => ({ text: (b.textContent||'').trim().replace(/\s+/g,' '), classes: b.className, attrs: Array.from(b.attributes||[]).map(a=>({name:a.name,value:a.value})) })) }));
        });

        console.log('📊 Page structure sample:', JSON.stringify(pageStructure, null, 2));

    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        await browser.close();
    }
}

// Run
(async () => {
    await testHuntleyInteractor();
})();
