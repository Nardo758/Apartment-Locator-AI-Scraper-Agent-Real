const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Load the element_interaction.js content and evaluate in the JSDOM window
const scriptContent = fs.readFileSync(path.resolve(__dirname, '..', 'element_interaction.js'), 'utf8');

function createWindow(html) {
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    const { window } = dom;
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = scriptContent;
    window.document.body.appendChild(scriptEl);
    return window;
}

describe('RobustElementInteractor (JSDOM)', () => {
    test('finds element with primary selector and clicks', async () => {
        const html = `
            <html>
            <body>
                <form id="user-settings">
                    <button class="btn-secondary">Cancel</button>
                    <button class="btn-primary" data-action="submit">Save Changes</button>
                </form>
            </body>
            </html>
        `;
        const window = createWindow(html);
        const { RobustElementInteractor } = window;
        const interactor = new window.RobustElementInteractor({ timeout: 1000 });
        const result = await interactor.interact('form#user-settings', ['button[data-action="submit"]'], 'click');
        expect(result).toBe(true);
    });

    test('falls back to secondary selector', async () => {
        const html = `
            <html>
            <body>
                <form id="user-settings">
                    <button class="btn-primary" data-action="submit">Save Changes</button>
                </form>
            </body>
            </html>
        `;
        const window = createWindow(html);
        const interactor = new window.RobustElementInteractor({ timeout: 1000 });
        const result = await interactor.interact('form#user-settings', ['button.non-existent', '.btn-primary'], 'click');
        expect(result).toBe(true);
    });

    test('validates container existence', async () => {
        const html = `
            <html><body></body></html>
        `;
        const window = createWindow(html);
        const interactor = new window.RobustElementInteractor({ timeout: 500 });
        await expect(interactor.interact('form#non-existent', ['.btn'], 'click')).rejects.toThrow('Container not found');
    });

    test('handles dynamic content simulation', async () => {
        const html = `
            <html>
            <body></body>
            </html>
        `;
        const window = createWindow(html);
        const interactor = new window.RobustElementInteractor({ timeout: 1000, retryInterval: 50 });

        // Simulate dynamic content after 100ms
        setTimeout(() => {
            const newSection = window.document.createElement('div');
            newSection.innerHTML = '<button class="dynamic-btn">New Button</button>';
            window.document.body.appendChild(newSection);
        }, 100);

        const result = await interactor.interact('body', ['.dynamic-btn'], 'click');
        expect(result).toBe(true);
    });

});
