/**
 * RobustElementInteractor
 * - Wait/retry for containers and elements (configurable timeout)
 * - Interactability checks
 * - Selector scoring & validation
 * - Action-specific validation
 * - Scoped queries for performance
 * - Tiered recovery strategies
 *
 * Usage: copy into browser console or include in automation script
 */

class RobustElementInteractor {
    constructor(options = {}) {
        this.timeout = options.timeout || 5000;
        this.retryInterval = options.retryInterval || 150; // ms
        this.maxRetries = Math.ceil(this.timeout / this.retryInterval);
        this.options = options; // store options for logging
    }

    async waitForElement(selector, timeout = this.timeout) {
        const start = Date.now();
        // Try immediate find first
        try {
            const el0 = document.querySelector(selector);
            if (el0) return el0;
        } catch (e) {
            // ignore invalid selector syntax
        }

        // Conservative incremental scroll search to avoid skipping content
        const step = 200; // px per scroll
        const stepDelay = Math.max(this.retryInterval, 150);
        let lastScrollTop = -1;
        while (Date.now() - start < timeout) {
            try {
                const el = document.querySelector(selector);
                if (el) return el;
            } catch (e) {
                // ignore invalid selector errors
            }

            // If we've reached the bottom and still not found, break early
            const doc = document.scrollingElement || document.documentElement || document.body;
            const maxScroll = (doc.scrollHeight || document.body.scrollHeight) - (window.innerHeight || 0);
            const current = doc.scrollTop || window.pageYOffset || 0;
            if (current === lastScrollTop && current >= maxScroll) {
                // no more content to reveal
                break;
            }

            lastScrollTop = current;
            // small incremental scroll
            try {
                window.scrollBy({ top: step, left: 0, behavior: 'auto' });
            } catch (e) {
                // fallback
                window.scrollBy(0, step);
            }

            await this._sleep(stepDelay);
        }

        // final attempt: try document-wide query (in case selector used scoping that failed)
        try {
            return document.querySelector(selector);
        } catch (e) {
            return null;
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isElementInteractable(element) {
        try {
            if (!element) return false;
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
                element.offsetParent !== null &&
                !element.disabled &&
                rect.width > 0 && rect.height > 0 &&
                style.pointerEvents !== 'none' &&
                style.visibility !== 'hidden' &&
                style.display !== 'none'
            );
        } catch (e) {
            return false;
        }
    }

    validateSelectorSpecificity(selectors) {
        return selectors.map(selector => {
            const elements = document.querySelectorAll(selector);
            return {
                selector,
                count: elements.length,
                isUnique: elements.length === 1
            };
        });
    }

    validateForAction(element, action) {
        if (!element) return false;
        switch (action) {
            case 'click':
                return this.isElementInteractable(element);
            case 'input':
                return !element.readOnly && !element.disabled && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA');
            case 'select':
                return element.tagName === 'SELECT' && !element.disabled;
            case 'setValue':
                return !element.readOnly && !element.disabled;
            default:
                return true;
        }
    }

    findElementInContainer(container, selectors) {
        for (const selector of selectors) {
            try {
                const el = container.querySelector(selector);
                if (el) return el;
            } catch (e) {
                // ignore invalid selector
                continue;
            }
        }
        return null;
    }

    async findElement(container, selectors, recoveryStrategies = []) {
        // Primary: try provided selectors scoped to container
        const primary = this.findElementInContainer(container, selectors);
        if (primary) return primary;

        // Secondary: try recovery strategies (functions that return element or null)
        for (const strategy of recoveryStrategies) {
            try {
                const el = await strategy(container);
                if (el) return el;
            } catch (e) {
                // ignore
            }
        }

        // Tertiary: try global selectors as last resort (not scoped)
        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                if (el) return el;
            } catch (e) {
                continue;
            }
        }

        return null;
    }

    // Example recovery helpers
    async findByDataAttributes(container) {
        // search for elements with data attributes related to action (data-action, data-apply, etc.)
        const attrs = ['[data-action]','[data-apply]','[data-price]','[data-floor]'];
        for (const a of attrs) {
            const el = container.querySelector(a);
            if (el) return el;
        }
        return null;
    }

    async findByStructuralPosition(container) {
        // e.g., last button in container, or first .price sibling
        const btns = container.querySelectorAll('button');
        if (btns && btns.length) return btns[btns.length-1];
        const price = container.querySelector('[class*=price], [class*=rent]');
        if (price) {
            const sibling = price.parentElement.querySelector('button');
            if (sibling) return sibling;
        }
        return null;
    }

    async findBySemanticRole(container) {
        const el = container.querySelector('[role="button"], [role="link"]');
        if (el) return el;
        return null;
    }

    async findByTabIndexOrder(container) {
        const focusables = container.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
        if (!focusables.length) return null;
        return focusables[0];
    }

    // Execute interaction with action-specific handling
    async executeAction(element, action, value = null) {
        if (!element) throw new Error('No element to act on');

        switch (action) {
            case 'click':
                element.click();
                return true;
            case 'focus':
                element.focus();
                return true;
            case 'input':
            case 'setValue':
                element.focus();
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            case 'select':
                if (element.tagName === 'SELECT') {
                    element.value = value;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
                return false;
            default:
                throw new Error(`Unsupported action: ${action}`);
        }
    }

    async interact(containerSelector, elementSelectors, action = 'click', value = null) {
        // 1. Wait for container
        const container = await this.waitForElement(containerSelector, this.timeout);
        if (!container) throw new Error(`Container not found: ${containerSelector}`);

        // 2. Selector scoring & diagnostics (optional)
        const scoring = this.validateSelectorSpecificity(elementSelectors.map(s => `${containerSelector} ${s}`));
        // You can log or use scoring to pick most specific selector

        // 3. Try to find element with recovery strategies
        const recoveryStrategies = [
            this.findByDataAttributes.bind(this),
            this.findByStructuralPosition.bind(this),
            this.findBySemanticRole.bind(this),
            this.findByTabIndexOrder.bind(this)
        ];

        const element = await this.findElement(container, elementSelectors, recoveryStrategies);
        if (!element) throw new Error(`Element not found with selectors: ${elementSelectors.join(', ')}`);

        // 4. Validate for action
        if (!this.validateForAction(element, action)) {
            throw new Error(`Element not suitable for action: ${action}`);
        }

        // 5. Execute
        return await this.executeAction(element, action, value);
    }

    // More diagnostic-aware interaction: returns details about what matched and whether a modal or navigation occurred
    async interactDetailed(containerSelector, elementSelectors, action = 'click', value = null) {
        const container = await this.waitForElement(containerSelector, this.timeout);
        if (!container) return { ok: false, reason: 'container-not-found' };

        const scoring = this.validateSelectorSpecificity(elementSelectors.map(s => `${containerSelector} ${s}`));

        const recoveryStrategies = [
            this.findByDataAttributes.bind(this),
            this.findByStructuralPosition.bind(this),
            this.findBySemanticRole.bind(this),
            this.findByTabIndexOrder.bind(this)
        ];

        const element = await this.findElement(container, elementSelectors, recoveryStrategies);
        if (!element) return { ok: false, reason: 'element-not-found', scoring };

        // determine which selector matched (best-effort)
        let matchedSelector = null;
        for (const s of elementSelectors) {
            try {
                const candidate = container.querySelector(s);
                if (candidate && candidate.isSameNode && candidate.isSameNode(element)) {
                    matchedSelector = s; break;
                }
            } catch (e) { /* ignore */ }
        }

        // gather element metadata
        const href = (element.getAttribute && element.getAttribute('href')) || null;
        const dataAttrs = {};
        try {
            Array.from(element.attributes || []).forEach(a => { if ((a.name||'').startsWith('data-')) dataAttrs[a.name] = a.value; });
        } catch (e) {}

        // before state
        const beforeHref = (typeof location !== 'undefined') ? location.href : null;

        // execute action
        try {
            await this._executeAction(element, action, value);
        } catch (e) {
            return { ok: false, reason: 'action-failed', error: (e && e.message) || String(e), matchedSelector, href, dataAttrs, scoring };
        }

        // wait a moment for potential modal or navigation
        await this._sleep(500);

        // detect navigation
        const afterHref = (typeof location !== 'undefined') ? location.href : null;
        let actionType = 'in-page-js';
        if (beforeHref && afterHref && beforeHref !== afterHref) actionType = 'navigation';

        // detect modal/dialog presence (common patterns)
        let modalHtml = null;
        try {
            const modal = document.querySelector('.modal.show, [role="dialog"].show, #fp-modal, .modal[aria-hidden="false"], .modal[aria-modal="true"]');
            if (modal) {
                actionType = actionType === 'navigation' ? 'navigation+modal' : 'modal';
                modalHtml = modal.outerHTML;
            } else {
                // fallback: any element with role=dialog
                const dlg = document.querySelector('[role="dialog"]');
                if (dlg) { actionType = 'modal'; modalHtml = dlg.outerHTML; }
            }
        } catch (e) { /* ignore DOM read errors */ }

        return {
            ok: true,
            matchedSelector,
            href,
            dataAttrs,
            scoring,
            beforeHref,
            afterHref,
            actionType,
            modalHtml
        };
    }

    // Lightweight logging mixin: can be enabled by passing { logging: true } to constructor
    _log(...args) {
        if (this.options && this.options.logging) {
            try { console.debug('[RobustInteractor]', ...args); } catch(e) {}
        }
    }

    // Instrument key methods
    async _findElement(container, selectors, recoveryStrategies = []) {
        this._log('Attempting findElement', { containerSelector: container && (container.getAttribute ? container.getAttribute('class') : 'unknown'), selectors });
        const res = await this.findElement(container, selectors, recoveryStrategies);
        this._log('findElement result', { found: !!res, tag: res ? res.tagName : null });
        return res;
    }

    async _executeAction(element, action, value = null) {
        this._log('Executing action', action, { tag: element && element.tagName });
        try {
            // make sure the element is scrolled into view conservatively to avoid skipping over content
            try {
                if (element && element.scrollIntoView) {
                    element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
                    // small wait to allow any lazy load to trigger
                    await this._sleep(150);
                }
            } catch (e) { /* ignore */ }

            const r = await this.executeAction(element, action, value);
            this._log('Action result', { success: !!r });
            return r;
        } catch (e) {
            this._log('Action error', e.message);
            throw e;
        }
    }
}

// Expose for use in browser console or automation
window.RobustElementInteractor = RobustElementInteractor;

/* Usage examples (copy/paste into browser console):

(async () => {
    const r = new RobustElementInteractor({ timeout: 8000 });
    try {
        await r.interact('div[class*="floor-plan"]', ['button[data-action="availability"]', '.availability-btn', 'button:contains("Availability")'], 'click');
        console.log('Clicked availability');
    } catch (e) {
        console.error('Interaction failed:', e.message);
    }
})();

// Another example: set move-in date input
(async () => {
    const r = new RobustElementInteractor({ timeout: 6000 });
    try {
        await r.interact('section[class*="pricing"]', ['input[name="move_in_date"]', 'input[type="date"]'], 'setValue', '2025-10-03');
        console.log('Date set');
    } catch (e) {
        console.error('Interaction failed:', e.message);
    }
})();

*/