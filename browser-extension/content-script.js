/**
 * Content Script for Rental Scraper Navigator
 * Records user interactions on rental websites
 */

class NavigationRecorder {
    constructor() {
        this.actions = [];
        this.isRecording = false;
        this.sessionId = null;
        this.startTime = null;

        this.init();
    }

    init() {
        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sendResponse);
            return true; // Keep message channel open
        });

        // Check if we should auto-start recording on rental sites
        this.checkAutoStart();
    }

    checkAutoStart() {
        // Auto-start on known rental domains
        const rentalDomains = [
            'apartments.com', 'zillow.com', 'realtor.com',
            'apartmentfinder.com', 'rent.com', 'hotpads.com',
            'thehuntley.com', 'hanoverbuckheadvillage.com', 'altaporter.com'
        ];

        const currentDomain = window.location.hostname.toLowerCase();
        const isRentalSite = rentalDomains.some(domain => currentDomain.includes(domain));

        if (isRentalSite) {
            console.log('🏠 Rental site detected, starting recording...');
            this.startRecording();
        }
    }

    handleMessage(message, sendResponse) {
        switch (message.type) {
            case 'START_RECORDING':
                this.startRecording();
                sendResponse({ success: true });
                break;

            case 'STOP_RECORDING':
                const actions = this.stopRecording();
                sendResponse({ success: true, actions: actions });
                break;

            case 'GET_STATUS':
                sendResponse({
                    isRecording: this.isRecording,
                    actionCount: this.actions.length,
                    sessionId: this.sessionId
                });
                break;

            case 'CLEAR_ACTIONS':
                this.clearActions();
                sendResponse({ success: true });
                break;
        }
    }

    startRecording() {
        if (this.isRecording) return;

        this.isRecording = true;
        this.sessionId = 'session_' + Date.now();
        this.startTime = Date.now();
        this.actions = [];

        console.log('🎬 Started recording navigation session:', this.sessionId);

        // Set up event listeners
        this.setupEventListeners();

        // Notify background script
        chrome.runtime.sendMessage({
            type: 'RECORDING_STARTED',
            sessionId: this.sessionId,
            url: window.location.href
        });
    }

    stopRecording() {
        if (!this.isRecording) return [];

        this.isRecording = false;
        const actions = [...this.actions];

        console.log('⏹️ Stopped recording, captured', actions.length, 'actions');

        // Clean up event listeners
        this.cleanupEventListeners();

        // Notify background script
        chrome.runtime.sendMessage({
            type: 'RECORDING_STOPPED',
            sessionId: this.sessionId,
            actions: actions
        });

        return actions;
    }

    setupEventListeners() {
        // Record clicks
        this.clickHandler = (e) => {
            if (!this.isRecording) return;

            const selector = this.getElementSelector(e.target);
            const action = {
                type: 'click',
                selector: selector,
                timestamp: Date.now(),
                url: window.location.href,
                elementText: e.target.textContent?.trim() || '',
                elementTag: e.target.tagName.toLowerCase(),
                elementId: e.target.id || '',
                elementClass: e.target.className || '',
                x: e.clientX,
                y: e.clientY
            };

            this.actions.push(action);
            console.log('📹 Recorded click:', selector);

            // Send to background for real-time updates
            chrome.runtime.sendMessage({
                type: 'ACTION_RECORDED',
                action: action
            });
        };

        document.addEventListener('click', this.clickHandler, true);

        // Record form submissions
        this.submitHandler = (e) => {
            if (!this.isRecording) return;

            const selector = this.getElementSelector(e.target);
            const action = {
                type: 'form_submit',
                selector: selector,
                timestamp: Date.now(),
                url: window.location.href,
                formAction: e.target.action || '',
                formMethod: e.target.method || 'get'
            };

            this.actions.push(action);
            console.log('📝 Recorded form submit:', selector);
        };

        document.addEventListener('submit', this.submitHandler, true);

        // Record input changes (for forms)
        this.inputHandler = (e) => {
            if (!this.isRecording) return;
            if (e.target.tagName.toLowerCase() !== 'input' &&
                e.target.tagName.toLowerCase() !== 'select' &&
                e.target.tagName.toLowerCase() !== 'textarea') return;

            const selector = this.getElementSelector(e.target);
            const action = {
                type: 'input_change',
                selector: selector,
                timestamp: Date.now(),
                url: window.location.href,
                inputType: e.target.type || '',
                inputName: e.target.name || '',
                inputValue: e.target.value || ''
            };

            this.actions.push(action);
            console.log('⌨️ Recorded input:', selector);
        };

        document.addEventListener('change', this.inputHandler, true);

        // Record page navigation (same origin)
        this.navigationHandler = (e) => {
            if (!this.isRecording) return;

            // Only record if it's a navigation we care about
            const action = {
                type: 'navigation',
                selector: '',
                timestamp: Date.now(),
                url: window.location.href,
                targetUrl: e.target.href || '',
                navigationType: 'link_click'
            };

            this.actions.push(action);
            console.log('🧭 Recorded navigation:', e.target.href);
        };

        // Add listeners to all links
        document.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'a' && e.target.href) {
                this.navigationHandler(e);
            }
        }, true);
    }

    cleanupEventListeners() {
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler, true);
        }
        if (this.submitHandler) {
            document.removeEventListener('submit', this.submitHandler, true);
        }
        if (this.inputHandler) {
            document.removeEventListener('change', this.inputHandler, true);
        }
    }

    getElementSelector(element) {
        // Generate a unique CSS selector for the element
        const path = [];
        let currentElement = element;

        while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
            let selector = currentElement.nodeName.toLowerCase();

            if (currentElement.id) {
                // If element has ID, use it (should be unique)
                selector += `#${currentElement.id}`;
                path.unshift(selector);
                break;
            } else if (currentElement.className) {
                // Use classes
                const classes = currentElement.className.trim().split(/\s+/).filter(c => c);
                if (classes.length > 0) {
                    selector += `.${classes.join('.')}`;
                }
            }

            // Add nth-of-type if needed for uniqueness
            if (currentElement.parentNode) {
                const siblings = Array.from(currentElement.parentNode.children);
                const index = siblings.indexOf(currentElement);
                if (siblings.length > 1) {
                    selector += `:nth-child(${index + 1})`;
                }
            }

            path.unshift(selector);
            currentElement = currentElement.parentNode;

            // Limit path depth to avoid overly complex selectors
            if (path.length > 5) break;
        }

        return path.join(' > ');
    }

    clearActions() {
        this.actions = [];
        console.log('🗑️ Cleared recorded actions');
    }

    getActions() {
        return [...this.actions];
    }

    exportActions() {
        const data = {
            sessionId: this.sessionId,
            startTime: this.startTime,
            endTime: Date.now(),
            url: window.location.href,
            actions: this.actions,
            metadata: {
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                timestamp: new Date().toISOString()
            }
        };

        return data;
    }
}

// Initialize the recorder
const recorder = new NavigationRecorder();

// Make it available globally for debugging
window.navigationRecorder = recorder;