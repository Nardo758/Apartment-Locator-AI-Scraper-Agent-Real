/**
 * Background Script for Rental Scraper Navigator
 * Handles extension lifecycle and data persistence
 */

class BackgroundManager {
    constructor() {
        this.recordedSessions = {};
        this.currentSession = null;

        this.init();
    }

    init() {
        // Listen for messages from content scripts and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener(() => {
            console.log('🏠 Rental Scraper Navigator installed');
            this.initializeStorage();
        });

        // Load saved sessions
        this.loadSavedSessions();
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.type) {
                case 'RECORDING_STARTED':
                    await this.handleRecordingStarted(message, sender);
                    break;

                case 'RECORDING_STOPPED':
                    await this.handleRecordingStopped(message);
                    break;

                case 'ACTION_RECORDED':
                    await this.handleActionRecorded(message);
                    break;

                case 'GET_SESSIONS':
                    sendResponse({ sessions: this.recordedSessions });
                    break;

                case 'EXPORT_SESSION':
                    const session = await this.exportSession(message.sessionId);
                    sendResponse({ session: session });
                    break;

                case 'DELETE_SESSION':
                    await this.deleteSession(message.sessionId);
                    sendResponse({ success: true });
                    break;

                case 'IMPORT_SESSION':
                    await this.importSession(message.sessionData);
                    sendResponse({ success: true });
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleRecordingStarted(message, sender) {
        this.currentSession = {
            sessionId: message.sessionId,
            startTime: Date.now(),
            url: message.url,
            tabId: sender.tab?.id,
            actions: []
        };

        console.log('🎬 Recording started:', message.sessionId);
    }

    async handleRecordingStopped(message) {
        if (!this.currentSession) return;

        this.currentSession.endTime = Date.now();
        this.currentSession.actions = message.actions;
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

        // Save the session
        this.recordedSessions[message.sessionId] = this.currentSession;
        await this.saveSession(this.currentSession);

        console.log('⏹️ Recording stopped:', message.sessionId, 'with', message.actions.length, 'actions');

        this.currentSession = null;
    }

    async handleActionRecorded(message) {
        if (this.currentSession) {
            this.currentSession.actions.push(message.action);
        }
    }

    async initializeStorage() {
        // Set default settings
        const defaults = {
            autoStart: false,
            rentalDomains: [
                'apartments.com', 'zillow.com', 'realtor.com',
                'apartmentfinder.com', 'rent.com', 'hotpads.com'
            ],
            exportFormat: 'json'
        };

        chrome.storage.sync.set(defaults);
    }

    async saveSession(session) {
        try {
            const key = `session_${session.sessionId}`;
            await chrome.storage.local.set({ [key]: session });
            console.log('💾 Session saved:', session.sessionId);
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    async loadSavedSessions() {
        try {
            const result = await chrome.storage.local.get(null);
            const sessions = {};

            for (const [key, value] of Object.entries(result)) {
                if (key.startsWith('session_')) {
                    sessions[key.replace('session_', '')] = value;
                }
            }

            this.recordedSessions = sessions;
            console.log('📂 Loaded', Object.keys(sessions).length, 'saved sessions');
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }

    async exportSession(sessionId) {
        const session = this.recordedSessions[sessionId];
        if (!session) return null;

        // Convert to export format
        const exportData = {
            sessionId: session.sessionId,
            url: session.url,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
            actions: session.actions,
            metadata: {
                exportedAt: Date.now(),
                exportedBy: 'Rental Scraper Navigator',
                version: '1.0'
            }
        };

        // Download as JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        await chrome.downloads.download({
            url: url,
            filename: `rental_scraper_session_${sessionId}.json`,
            saveAs: true
        });

        URL.revokeObjectURL(url);
        return exportData;
    }

    async deleteSession(sessionId) {
        delete this.recordedSessions[sessionId];
        const key = `session_${sessionId}`;
        await chrome.storage.local.remove([key]);
        console.log('🗑️ Session deleted:', sessionId);
    }

    async importSession(sessionData) {
        const sessionId = sessionData.sessionId;
        this.recordedSessions[sessionId] = sessionData;
        await this.saveSession(sessionData);
        console.log('📥 Session imported:', sessionId);
    }
}

// Initialize the background manager
const manager = new BackgroundManager();