import { By, until, WebDriver, WebElement } from 'selenium-webdriver';
import { NoSuchElementError } from 'selenium-webdriver/lib/error';

export class PopupHandler {
    private driver: WebDriver;

    constructor(driver: WebDriver) {
        this.driver = driver;
    }

    public async checkSeeMorePopup(wait: boolean = false): Promise<boolean> {
        let seeMorePopup: WebElement;
        try {
            if (wait) {
                seeMorePopup = await this.driver.wait(
                    until.elementLocated(
                        By.xpath('//div[contains(., "See more on Facebook")]'),
                    ),
                    10000,
                );
            } else {
                seeMorePopup = await this.driver.findElement(
                    By.xpath('//div[contains(., "See more on Facebook")]'),
                );
            }
        } catch (error) {
            if (error instanceof NoSuchElementError) {
                return true;
            }
            throw error;
        }
        let closeButton: WebElement;
        try {
            closeButton = await seeMorePopup.findElement(
                By.xpath('.//div[@aria-label="Close" and @role="button"]'),
            );
        } catch (error) {
            if (error instanceof NoSuchElementError) {
                return false;
            }
            throw error;
        }
        await closeButton.click();
        return true;
    }

    public async checkLoginPopup(wait: boolean = false): Promise<void> {
        let loginPopupText: WebElement;
        if (wait) {
            loginPopupText = await this.driver.wait(
                until.elementLocated(
                    By.xpath(
                        '//span[contains(., "Log in or sign up for") and not(span)]',
                    ),
                ),
                10000,
            );
        } else {
            try {
                loginPopupText = await this.driver.findElement(
                    By.xpath(
                        '//span[contains(., "Log in or sign up for") and not(span)]',
                    ),
                );
            } catch (error) {
                if (error instanceof NoSuchElementError) {
                    return;
                }
                throw error;
            }
        }
        const script = `
          function findFixedParent(element) {
            let parent = element;
            while (parent) {
              const style = window.getComputedStyle(parent);
              if (style.position === 'fixed') {
                return parent;
              }
              parent = parent.parentElement;
            }
            return null;
          }
          return findFixedParent(arguments[0]);
        `;
        const fixedParent: WebElement = await this.driver.executeScript(
            script,
            loginPopupText,
        );
        if (fixedParent) {
            await this.driver.executeScript(
                'arguments[0].style.display = "none";',
                fixedParent,
            );
        }
    }

    public async withPopupChecks(
        action: () => Promise<void>,
        wait: boolean = false,
    ): Promise<void> {
        await this.checkSeeMorePopup(wait);
        await this.checkLoginPopup(wait);
        await action();
    }
}
