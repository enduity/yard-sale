import chrome from 'selenium-webdriver/chrome';
import { Browser, Builder, WebDriver } from 'selenium-webdriver';

/**
 * A class to provide a WebDriver instance for use in the Facebook Marketplace API
 */
export class WebDriverProvider {
    private readonly _driver: WebDriver;
    private _isInUse: boolean = false;
    private _callbackQueue: Array<() => void> = [];

    constructor() {
        console.log('Creating a new WebDriver instance');
        const options = new chrome.Options();
        options.addArguments(
            '--disable-blink-features=AutomationControlled',
            '--window-size=2560,1440',
            '--headless'
        );
        this._driver = new Builder()
            .forBrowser(Browser.CHROME)
            .setChromeOptions(options)
            .build();
    }

    /**
     * Get the driver instance, waiting if it is already in use
     */
    get driver() {
        return (async () => {
            if (!this._isInUse) {
                this._isInUse = true;
                return this._driver;
            }
            return new Promise<WebDriver>((resolve) => {
                this._callbackQueue.push(() => {
                    this._isInUse = true;
                    resolve(this._driver);
                });
            });
        })();
    }

    /**
     * Release the driver instance
     */
    async releaseDriver() {
        this._isInUse = false;
        const callback = this._callbackQueue.shift();
        if (callback) {
            callback();
        }
    }

    /**
     * Quit the driver instance
     */
    async quitDriver() {
        if (this._isInUse) {
            // If the driver is in use, add a callback to quit the driver
            this._callbackQueue.push(async () => {
                await this._driver.quit();
            });
        } else {
            // Otherwise, quit the driver immediately
            await this._driver.quit();
        }
    }
}
