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
                    console.log('"See more" popup not found, continuing');
                    return true;
                }
                throw error;
            }
        }
        const seeMorePopup = await this.page.$(
            '::-p-xpath(//div[contains(., "See more on Facebook")])',
        );
        if (!seeMorePopup) {
            console.log('"See more" popup not found, continuing');
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
        console.log('Closed "See more" popup');
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
                    console.log('Login popup not found, continuing');
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
            console.log('Hid login popup');
        }
    }

    public async acceptCookies(): Promise<void> {
        const cookiesButton = await this.page.waitForSelector(
            'div[aria-label="Allow all cookies"][role="button"]:not([aria-disabled="true"])',
            { timeout: 10000 },
        );
        if (!cookiesButton) {
            throw new Error('Cookies button not found');
        }
        await cookiesButton.click();
    }
}
