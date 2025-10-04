const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runCapture() {
  const outDir = path.resolve(__dirname, 'capture');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1366, height: 900 } }
  });

  const page = await context.newPage();
  try {
    console.log('Navigating...');
    await page.goto('https://www.thehuntley.com/floorplans', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // best-effort close overlays
    try {
      await page.evaluate(() => {
        ['#acsBtn', '#acsClose', '.close.acs-Close', '#acsOptions button.close', '#rl-email-container', '#rl-email'].forEach(s => {
          const el = document.querySelector(s);
          if (el && el.click) try { el.click(); } catch(e) {}
          if (el && el.remove) try { el.remove(); } catch(e) {}
        });
      });
    } catch (e) {}

    // scroll to trigger lazy load
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.6));
      await page.waitForTimeout(350);
    }

    // ensure container
    await page.waitForSelector('div[id^="fp-container-"]', { timeout: 20000 });
    const containerId = await page.evaluate(() => {
      const el = document.querySelector('div[id^="fp-container-"]');
      return el ? el.id : null;
    });

    if (!containerId) throw new Error('No fp-container found');

    // inject interactor
    await page.addScriptTag({ path: path.resolve(__dirname, 'element_interaction.js') });

    // perform detailed interaction (detect modal vs navigation and extract modal content)
    const result = await page.evaluate(async (container) => {
      if (!window.RobustElementInteractor) return { ok: false, reason: 'interactor-missing' };
      const interactor = new window.RobustElementInteractor({ timeout: 15000, logging: true });
      const selectors = ['a.track-apply', 'a.floorplan-action-button', 'a[data-selenium-id^="floorplan-"]', 'a.btn-primary'];
      if (typeof interactor.interactDetailed === 'function') {
        return await interactor.interactDetailed(`#${container}`, selectors, 'click');
      }
      // fallback
      const res = await interactor.interact(`#${container}`, selectors, 'click');
      const matched = selectors.find(s => document.querySelector(`#${container} ${s}`));
      const el = matched ? document.querySelector(`#${container} ${matched}`) : null;
      const href = el ? el.getAttribute('href') : null;
      return { ok: !!res, res, matched, href };
    }, containerId);

    const timestamp = Date.now();
    const screenshotPath = path.join(outDir, `huntley_click_${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    await context.close(); // stops video recording and writes file
    await browser.close();

    // find latest video file
    const videos = fs.readdirSync(outDir).filter(f => f.endsWith('.webm'));
    const videoFile = videos.length ? path.join(outDir, videos.sort().pop()) : null;

    const summary = { timestamp, containerId, result, screenshot: screenshotPath, video: videoFile };
    const outJson = path.join(outDir, `huntley_click_result_${timestamp}.json`);
    fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
    console.log('Wrote summary:', outJson);
    console.log('Summary:', summary);
    return summary;
  } catch (err) {
    console.error('Capture run failed:', err);
    await context.close().catch(()=>{});
    await browser.close().catch(()=>{});
    throw err;
  }
}

if (require.main === module) {
  runCapture().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runCapture };
