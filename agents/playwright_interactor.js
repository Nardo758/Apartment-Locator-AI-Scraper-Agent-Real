const fs = require('fs');

class PlaywrightInteractor {
    constructor(page, options = {}) {
        this.page = page;
        this.options = options;
    }

    async injectInteractor(scriptPath = './agents/element_interaction.js') {
        // Read file and add as script content to the page
        const scriptContent = fs.readFileSync(scriptPath, { encoding: 'utf8' });
        await this.page.addScriptTag({ content: scriptContent });
    }

    async robustClick(containerSelector, elementSelectors, options = {}) {
        const args = {
            containerSelector,
            elementSelectors,
            timeout: options.timeout || 5000,
            logging: options.logging || false
        };

        return await this.page.evaluate(async (args) => {
            // Use window.RobustElementInteractor defined by the injected script
            if (!window.RobustElementInteractor) {
                throw new Error('RobustElementInteractor not present in page context. Did you call injectInteractor()?');
            }
            const interactor = new window.RobustElementInteractor({ timeout: args.timeout });
            return await interactor.interact(args.containerSelector, args.elementSelectors, 'click');
        }, args);
    }

    async robustSetValue(containerSelector, elementSelectors, value, options = {}) {
        const args = {
            containerSelector,
            elementSelectors,
            timeout: options.timeout || 5000,
            value
        };

        return await this.page.evaluate(async (args) => {
            if (!window.RobustElementInteractor) {
                throw new Error('RobustElementInteractor not present in page context. Did you call injectInteractor()?');
            }
            const interactor = new window.RobustElementInteractor({ timeout: args.timeout });
            return await interactor.interact(args.containerSelector, args.elementSelectors, 'setValue', args.value);
        }, args);
    }

    async robustFill(containerSelector, elementSelectors, value, options = {}) {
        return await this.robustSetValue(containerSelector, elementSelectors, value, options);
    }
}

module.exports = PlaywrightInteractor;
