import { WebDriver } from 'selenium-webdriver';
import webdriverProvider from './webdriverSingleton';

export class DriverManager {
    private driver: WebDriver | null = null;

    public async initDriver(): Promise<WebDriver> {
        if (!this.driver) {
            this.driver = await webdriverProvider.driver;
        }
        return this.driver;
    }

    public async closeDriver(): Promise<void> {
        if (this.driver) {
            await webdriverProvider.releaseDriver();
            this.driver = null;
        }
    }

    public getDriver(): WebDriver | null {
        return this.driver;
    }
}
