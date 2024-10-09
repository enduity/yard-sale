import { WebDriver, By, until, Key } from 'selenium-webdriver';
import { NoSuchElementError } from 'selenium-webdriver/lib/error';

export class Navigator {
    private driver: WebDriver;

    constructor(driver: WebDriver) {
        this.driver = driver;
    }

    public async navigateToMarketplace(): Promise<void> {
        await this.driver.get('https://www.facebook.com/');
        await this.driver.executeScript('window.localStorage.clear();');
        await this.driver.get('https://www.facebook.com/marketplace/112548588756543/');
    }

    public async acceptCookies(): Promise<void> {
        try {
            const cookiesButton = await this.driver.wait(
                until.elementLocated(
                    By.xpath(
                        '//div[@aria-label="Allow all cookies" and @role="button" and not(@aria-disabled="true")]'
                    )
                ),
                10000
            );
            await cookiesButton.click();
        } catch (error) {
            console.error('Error accepting cookies:', error);
            throw error;
        }
    }

    public async checkIfCorrectLocation(location: string): Promise<boolean> {
        try {
            await this.driver.findElement(
                By.xpath(`//div[@role="button" and contains(., ${location})]`)
            );
            return true;
        } catch (error) {
            if (error instanceof NoSuchElementError) {
                return false;
            }
            throw error;
        }
    }

    public async setLocation(locationName: string, radius: string): Promise<void> {
        try {
            const locationButton = await this.driver.wait(
                until.elementLocated(
                    By.xpath(
                        '//div[@role="button" and contains(., "San Francisco, California")]'
                    )
                ),
                10000
            );
            await locationButton.click();

            const locationInput = await this.driver.wait(
                until.elementLocated(By.xpath('//label[@aria-label="Location"]//input')),
                10000
            );
            await locationInput.clear();
            await locationInput.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
            await locationInput.sendKeys(locationName);

            const locationOption = await this.driver.wait(
                until.elementLocated(
                    By.xpath(`//div[@role="option" and contains(., "${locationName}")]`)
                ),
                10000
            );
            await locationOption.click();

            const radiusButton = await this.driver.wait(
                until.elementLocated(
                    By.xpath('//label[@role="combobox" and @aria-label="Radius"]')
                ),
                10000
            );
            await radiusButton.click();

            const radiusOption = await this.driver.wait(
                until.elementLocated(
                    By.xpath(`//div[@role="option" and contains(., "${radius}")]`)
                ),
                10000
            );
            await radiusOption.click();

            const applyButton = await this.driver.wait(
                until.elementLocated(
                    By.xpath('//div[@role="button" and contains(., "Apply")]')
                ),
                10000
            );
            await applyButton.click();

            await this.waitForListingLoad();
        } catch (error) {
            console.error('Error setting location and radius:', error);
            throw error;
        }
    }

    public async performSearch(searchTerm: string): Promise<void> {
        try {
            const searchInput = await this.driver.wait(
                until.elementIsVisible(
                    this.driver.findElement(
                        By.xpath(
                            '//input[@aria-label="Search Marketplace" and @type="search"]'
                        )
                    )
                ),
                10000
            );
            await searchInput.clear();
            await searchInput.sendKeys(searchTerm, Key.RETURN);

            await this.waitForListingLoad();
        } catch (error) {
            console.error('Error performing search:', error);
            throw error;
        }
    }

    private async waitForListingLoad(): Promise<void> {
        const listingContainer = await this.driver.findElement(
            By.xpath('//div[contains(@style, "max-width")]/div[@class]')
        );

        await this.driver.wait(until.stalenessOf(listingContainer), 10000);

        await this.driver.wait(
            until.elementLocated(
                By.xpath('//div[contains(@style, "max-width")]/div[@class]')
            ),
            10000
        );
    }
}
