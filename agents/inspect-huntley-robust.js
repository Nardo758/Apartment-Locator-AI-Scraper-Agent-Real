const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 50 });
    const page = await browser.newPage({
        viewport: { width: 1400, height: 1000 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });

    try {
        console.log('🔎 Going to https://www.thehuntley.com/floorplans with domcontentloaded');
        await page.goto('https://www.thehuntley.com/floorplans', { waitUntil: 'domcontentloaded', timeout: 120000 });

        // Close common overlays if present
        const overlaySelectors = ['button[aria-label*="close"]', '.close', '.cookie-consent__close', '#onetrust-accept-btn-handler', '.modal-close'];
        for (const sel of overlaySelectors) {
            try {
                const el = await page.$(sel);
                if (el) {
                    console.log('Closing overlay', sel);
                    await el.click({ timeout: 2000 }).catch(()=>{});
                    await page.waitForTimeout(300);
                }
            } catch (e) {}
        }

        // Scroll slowly to trigger lazy load
        for (let i=0;i<8;i++){
            await page.evaluate(() => window.scrollBy(0, window.innerHeight/2));
            await page.waitForTimeout(500);
        }

        // Wait for likely container selectors
        const candidateSelectors = ['.unit-card', '.floor-plan', '.floorplan-container', '.apartment-listing', 'article', 'section'];
        let found = null;
        for (const sel of candidateSelectors) {
            try {
                await page.waitForSelector(sel, { timeout: 3000 });
                found = sel;
                console.log('Found candidate selector on page:', sel);
                break;
            } catch (e) {
                // not found, continue
            }
        }

        // If none of the above found, list top-level buttons for manual inspection
        const candidates = await page.evaluate(() => {
            const nodes = Array.from(document.querySelectorAll('div, section, article'));
            return nodes.map(el => {
                const btns = Array.from(el.querySelectorAll('button, a'));
                return {
                    tag: el.tagName.toLowerCase(),
                    classes: el.className ? el.className.trim() : '',
                    id: el.id || null,
                    btnCount: btns.length,
                    sampleButtons: btns.slice(0,5).map(b=>({text:(b.textContent||'').trim().replace(/\s+/g,' '), classes:b.className||'', attrs: Array.from(b.attributes||[]).map(a=>({name:a.name,value:a.value}))}))
                };
            }).filter(x=>x.btnCount>0).sort((a,b)=>b.btnCount-a.btnCount).slice(0,30);
        });

        console.log('📊 Candidate containers with buttons (top 30):');
        console.log(JSON.stringify(candidates, null, 2));

        // Save a screenshot for manual review
        const ssPath = path.resolve(__dirname, 'huntley_page.png');
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log('📸 Saved screenshot to', ssPath);

        // Save page HTML snippet
        const htmlSnippet = await page.content();
        const htmlPath = path.resolve(__dirname, 'huntley_page.html');
        fs.writeFileSync(htmlPath, htmlSnippet, 'utf8');
        console.log('💾 Saved page HTML to', htmlPath);

    } catch (e) {
        console.error('Error during robust inspection:', e);
    } finally {
        // keep browser open a bit for manual inspection then close
        await page.waitForTimeout(2000);
        await browser.close();
    }
})();
