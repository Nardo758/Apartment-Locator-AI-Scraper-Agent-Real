// Lightweight stealth script to mask automation properties.
// This attempts to hide common Playwright/Chromium traces; it won't defeat
// advanced fingerprinting or CAPTCHAs but helps with basic bot checks.
(function () {
  try {
    // navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
  } catch (e) {}

  try {
    // languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });
  } catch (e) {}

  try {
    // plugins
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5], configurable: true });
  } catch (e) {}

  try {
    // mimic chrome object
    if (!window.chrome) {
      window.chrome = { runtime: {}, // minimal shape
      }; 
    }
  } catch (e) {}

  try {
    // provide a proper permissions.query implementation
    const originalQuery = navigator.permissions && navigator.permissions.query;
    if (originalQuery) {
      navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters)
      );
    }
  } catch (e) {}

  // override userAgent hints if available (best-effort)
  try {
    if (navigator.userAgent && navigator.userAgent.indexOf('Headless') !== -1) {
      Object.defineProperty(navigator, 'userAgent', { get: () => navigator.userAgent.replace(/HeadlessChrome\/[\d.]+\s*/i, '') });
    }
  } catch (e) {}

})();
