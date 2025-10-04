/**
 * Popup Script for Rental Scraper Navigator
 * Handles the extension popup UI
 */

class PopupManager {
    constructor() {
        this.isRecording = false;
        this.actionCount = 0;
        this.currentSessionId = null;

        this.init();
    }

    init() {
        // Get DOM elements
        this.statusDiv = document.getElementById('status');
        this.startBtn = document.getElementById('start-recording');
        this.stopBtn = document.getElementById('stop-recording');
        this.actionCountSpan = document.getElementById('action-count');
        this.recordingInfo = document.getElementById('recording-info');
        this.exportCurrentBtn = document.getElementById('export-current');
        this.sessionsContainer = document.getElementById('sessions-container');

        // Set up event listeners
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        document.getElementById('clear-actions').addEventListener('click', () => this.clearActions());
        document.getElementById('view-sessions').addEventListener('click', () => this.viewSessions());
        this.exportCurrentBtn.addEventListener('click', () => this.exportCurrentSession());

        // Check current recording status
        this.checkRecordingStatus();
    }

    async checkRecordingStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
            this.updateRecordingStatus(response);
        } catch (error) {
            // Content script might not be loaded yet
            console.log('Content script not ready');
        }
    }

    async startRecording() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('No active tab found');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });

            if (response && response.success) {
                this.isRecording = true;
                this.updateUI();
                console.log('🎬 Recording started');
            } else {
                alert('Failed to start recording. Make sure you\'re on a webpage.');
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Error starting recording: ' + error.message);
        }
    }

    async stopRecording() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            const response = await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });

            if (response && response.success) {
                this.isRecording = false;
                this.actionCount = response.actions ? response.actions.length : 0;
                this.updateUI();

                // Show export option
                this.exportCurrentBtn.classList.remove('hidden');

                console.log('⏹️ Recording stopped, actions:', this.actionCount);
            }
        } catch (error) {
            console.error('Error stopping recording:', error);
        }
    }

    async clearActions() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_ACTIONS' });
            this.actionCount = 0;
            this.updateActionCount();
            console.log('🗑️ Actions cleared');
        } catch (error) {
            console.error('Error clearing actions:', error);
        }
    }

    updateRecordingStatus(response) {
        if (response && response.isRecording) {
            this.isRecording = true;
            this.actionCount = response.actionCount || 0;
            this.currentSessionId = response.sessionId;
        } else {
            this.isRecording = false;
            this.actionCount = 0;
        }
        this.updateUI();
    }

    updateUI() {
        // Update status display
        this.statusDiv.className = this.isRecording ? 'status recording' : 'status stopped';
        this.statusDiv.textContent = this.isRecording ? 'Recording...' : 'Not Recording';

        // Update buttons
        this.startBtn.classList.toggle('hidden', this.isRecording);
        this.stopBtn.classList.toggle('hidden', !this.isRecording);

        // Update recording info
        this.recordingInfo.classList.toggle('hidden', !this.isRecording && this.actionCount === 0);
        this.updateActionCount();

        // Update export button
        this.exportCurrentBtn.classList.toggle('hidden', this.isRecording || this.actionCount === 0);
    }

    updateActionCount() {
        this.actionCountSpan.textContent = this.actionCount;
    }

    async viewSessions() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });

            if (response && response.sessions) {
                this.displaySessions(response.sessions);
                this.sessionsContainer.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error getting sessions:', error);
        }
    }

    displaySessions(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        sessionsList.innerHTML = '';

        if (Object.keys(sessions).length === 0) {
            sessionsList.innerHTML = '<div class="session-item">No saved sessions</div>';
            return;
        }

        for (const [sessionId, session] of Object.entries(sessions)) {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-item';

            const url = document.createElement('div');
            url.className = 'session-url';
            url.textContent = session.url || 'Unknown URL';

            const meta = document.createElement('div');
            meta.className = 'session-meta';
            const duration = session.duration ? Math.round(session.duration / 1000) : 0;
            const actionCount = session.actions ? session.actions.length : 0;
            meta.textContent = `${actionCount} actions • ${duration}s • ${new Date(session.startTime).toLocaleDateString()}`;

            // Add action buttons
            const actions = document.createElement('div');
            actions.style.marginTop = '5px';

            const exportBtn = document.createElement('button');
            exportBtn.textContent = 'Export';
            exportBtn.style.fontSize = '11px';
            exportBtn.style.padding = '2px 6px';
            exportBtn.style.marginRight = '5px';
            exportBtn.addEventListener('click', () => this.exportSession(sessionId));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.style.fontSize = '11px';
            deleteBtn.style.padding = '2px 6px';
            deleteBtn.style.backgroundColor = '#f44336';
            deleteBtn.style.color = 'white';
            deleteBtn.addEventListener('click', () => this.deleteSession(sessionId));

            actions.appendChild(exportBtn);
            actions.appendChild(deleteBtn);

            sessionDiv.appendChild(url);
            sessionDiv.appendChild(meta);
            sessionDiv.appendChild(actions);

            sessionsList.appendChild(sessionDiv);
        }
    }

    async exportCurrentSession() {
        if (!this.currentSessionId) {
            alert('No current session to export');
            return;
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'EXPORT_SESSION',
                sessionId: this.currentSessionId
            });
        } catch (error) {
            console.error('Error exporting session:', error);
        }
    }

    async exportSession(sessionId) {
        try {
            await chrome.runtime.sendMessage({
                type: 'EXPORT_SESSION',
                sessionId: sessionId
            });
        } catch (error) {
            console.error('Error exporting session:', error);
        }
    }

    async deleteSession(sessionId) {
        if (!confirm('Are you sure you want to delete this session?')) {
            return;
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'DELETE_SESSION',
                sessionId: sessionId
            });

            // Refresh the sessions list
            await this.viewSessions();
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    }
}

// Initialize the popup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});