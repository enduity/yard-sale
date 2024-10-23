import { Page } from 'puppeteer';
import { TimeoutError } from 'puppeteer';

export class PopupHandler {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public async checkSeeMorePopup(wait: boolean = false): Promise<boolean> {
        if (wait) {
            try {
                await this.page.waitForSelector(
                    '::-p-xpath(//div[contains(., "See more on Facebook")])',
                    {
                        timeout: 10000,
                    },
                );
            } catch (error) {
                if (error instanceof TimeoutError) {
                    return true;
                }
                throw error;
            }
        }
        const seeMorePopup = await this.page.$(
            '::-p-xpath(//div[contains(., "See more on Facebook")])',
        );
        if (!seeMorePopup) {
            return true;
        }
        const closeButton = await seeMorePopup.$(
            'div[aria-label="Close"][role="button"]',
        );
        if (!closeButton) {
            console.error('Close button not found, could not close popup');
            return false;
        }
        await closeButton.click();
        return true;
    }

    public async checkLoginPopup(wait: boolean = false): Promise<void> {
        if (wait) {
            try {
                await this.page.waitForSelector('span::-p-text(Log in or sign up for)', {
                    timeout: 10000,
                });
            } catch (error) {
                if (error instanceof TimeoutError) {
                    return;
                }
                throw error;
            }
        }
        const loginPopupText = await this.page
            .locator('span::-p-text(Log in or sign up for)')
            .waitHandle();
        const loginPopupSpan = await loginPopupText.toElement('span');

        const fixedParent = await loginPopupSpan.evaluateHandle((element) => {
            function findFixedParent(element: HTMLElement): HTMLElement {
                let parent: HTMLElement | null = element;
                while (parent) {
                    const styles = window.getComputedStyle(parent);
                    if (styles.getPropertyValue('position') === 'fixed') {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
                throw new Error('Fixed parent not found');
            }

            return findFixedParent(element);
        });
        if (fixedParent && fixedParent.asElement()) {
            await fixedParent.evaluate((el) => {
                el.style.display = 'none';
            });
        }
    }

    public async acceptCookies(): Promise<void> {
        const selector =
            'div[aria-label="Allow all cookies"][role="button"]:not([aria-disabled="true"])';
        let cookiesButton;
        try {
            cookiesButton = await this.page.waitForSelector(selector, { timeout: 500 });
        } catch (error) {
            if (!(error instanceof TimeoutError)) {
                throw error;
            }
        }
        if (cookiesButton) {
            await cookiesButton.click();
            return;
        }
        /**
         * In case the button takes longer, checking in the background.
         * Not in the foreground, because some geos don't have cookie regulations
         * and would never have a cookies button.
         */
        void (async () => {
            let retries = 0;
            let foundButton;
            while (!foundButton && retries < 20) {
                if (!this.page || this.page.isClosed()) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
                try {
                    foundButton = await this.page.$(selector);
                } catch (error) {
                    if (
                        error instanceof Error &&
                        error.message.includes('Execution context was destroyed')
                    ) {
                        return;
                    }
                    console.error('Error checking for cookies button:', error);
                    return;
                }
                retries++;
            }
            if (foundButton) {
                await foundButton.click();
            }
        })();
    }
}
