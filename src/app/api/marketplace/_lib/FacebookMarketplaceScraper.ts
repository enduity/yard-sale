import { By, Key, until, WebDriver, WebElement } from 'selenium-webdriver';
import crypto from 'crypto';
import {
    NoSuchElementError,
    StaleElementReferenceError,
    TimeoutError,
} from 'selenium-webdriver/lib/error';
import { ListingData } from '@/types';
import webdriverProvider from './webdriverSingleton';

export class FacebookMarketplaceScraper {
    private driver: WebDriver | null = null;
    private processedListings = new Set<string>();
    private collectedData: Array<ListingData> = [];

    async init(): Promise<void> {
        this.driver = await this.setUpDriver();
        await this.driver.manage().deleteAllCookies();
        const currentHandle = await this.driver.getWindowHandle();
        for (const handle of await this.driver.getAllWindowHandles()) {
            if (handle !== currentHandle) {
                await this.driver.switchTo().window(handle);
                await this.driver.close();
            }
        }
        await this.driver.switchTo().window(currentHandle);
    }

    async close(): Promise<void> {
        await webdriverProvider.releaseDriver();
        this.driver = null;
    }

    private async setUpDriver(): Promise<WebDriver> {
        return await webdriverProvider.driver;
    }

    public async scrape(searchTerm: string): Promise<Array<ListingData>> {
        if (!this.driver) {
            throw new Error('Driver not initialized.');
        }

        try {
            await this.navigateToMarketplace();
            await this.acceptCookies();

            const isCorrectLocation = await this.checkIfCorrectLocation('Ääsmäe');
            if (!isCorrectLocation) {
                await this.withPopupChecks(async () => {
                    await this.setLocation('Ääsmäe', '65');
                }, true);
            }

            await this.withPopupChecks(async () => {
                await this.performSearch(searchTerm);
            });

            await this.withPopupChecks(async () => {
                await this.scrollAndCollectListings();
            });

            return this.collectedData;
        } catch (error) {
            console.error('Error during scraping:', error);
            throw error;
        }
    }

    private async navigateToMarketplace(): Promise<void> {
        await this.driver!.get('https://www.facebook.com/');
        await this.driver!.executeScript('window.localStorage.clear();');
        await this.driver!.get('https://www.facebook.com/marketplace/112548588756543/');
    }

    private async acceptCookies(): Promise<void> {
        try {
            const cookiesButton = await this.driver!.wait(
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

    private async checkIfCorrectLocation(location: string): Promise<boolean> {
        try {
            await this.driver!.findElement(
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

    private async setLocation(locationName: string, radius: string): Promise<void> {
        try {
            const locationButton = await this.driver!.wait(
                until.elementLocated(
                    By.xpath(
                        '//div[@role="button" and contains(., "San Francisco, California")]'
                    )
                ),
                10000
            );
            await locationButton.click();

            const locationInput = await this.driver!.wait(
                until.elementLocated(By.xpath('//label[@aria-label="Location"]//input')),
                10000
            );
            await locationInput.clear();
            await locationInput.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
            await locationInput.sendKeys(locationName);

            const locationOption = await this.driver!.wait(
                until.elementLocated(
                    By.xpath(`//div[@role="option" and contains(., "${locationName}")]`)
                ),
                10000
            );
            await locationOption.click();

            const radiusButton = await this.driver!.wait(
                until.elementLocated(
                    By.xpath('//label[@role="combobox" and @aria-label="Radius"]')
                ),
                10000
            );
            await radiusButton.click();

            const radiusOption = await this.driver!.wait(
                until.elementLocated(
                    By.xpath(`//div[@role="option" and contains(., "${radius}")]`)
                ),
                10000
            );
            await radiusOption.click();

            const applyButton = await this.driver!.wait(
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

    private async performSearch(searchTerm: string): Promise<void> {
        try {
            const searchInput = await this.driver!.wait(
                until.elementIsVisible(
                    this.driver!.findElement(
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

    private async scrollAndCollectListings(): Promise<void> {
        const mainScrollableContainer = await this.findMainScrollableContainer();
        let previousScrollPosition: number = 0;
        if (mainScrollableContainer) {
            previousScrollPosition = await this.getScrollPosition();
        }

        while (true) {
            await this.checkSeeMorePopup();
            const listings = await this.getListingElements();

            if (listings.length === 0) {
                break;
            }

            await this.processListings(listings);

            if (!mainScrollableContainer) {
                break;
            }

            const newScrollPosition: number = await this.driver!.executeScript(
                'arguments[0].scrollTop = Math.min(arguments[0].scrollHeight, arguments[0].scrollTop + (window.innerHeight * 2)); return arguments[0].scrollTop;',
                mainScrollableContainer
            );

            const newContentLoaded = await this.waitForNewContent(listings);

            await this.checkSeeMorePopup();

            if (newScrollPosition === previousScrollPosition) {
                break;
            }

            if (!newContentLoaded) {
                break;
            }

            previousScrollPosition = newScrollPosition;
        }
    }

    private async getListingElements(): Promise<WebElement[]> {
        const listingCssSelector =
            'div[style*="max-width"] > div[class] > div[class] a:has(span:not(:empty))';
        return await this.driver!.findElements(By.css(listingCssSelector));
    }

    private async processListings(listings: WebElement[]): Promise<void> {
        const maxConcurrency = 10;

        for (let i = 0; i < listings.length; i += maxConcurrency) {
            const batch = listings.slice(i, i + maxConcurrency);
            await Promise.all(
                batch.map(async (listing) => {
                    try {
                        const listingDetails = await this.getListingDetails(listing);

                        if (!listingDetails) {
                            return;
                        }

                        const idHash = this.hashListing(listingDetails);

                        if (this.processedListings.has(idHash)) {
                            return; // Already processed
                        }

                        this.collectedData.push(listingDetails);
                        this.processedListings.add(idHash);
                    } catch (error) {
                        console.error('Error extracting data from listing:', error);
                    }
                })
            );
        }
    }

    private async getListingDetails(
        listingElement: WebElement
    ): Promise<ListingData | null> {
        const listingDetailsSelector = 'span:not(:has(span, i)):not(:empty)';
        let elements: WebElement[];

        try {
            elements = await listingElement.findElements(By.css(listingDetailsSelector));
        } catch (error) {
            if (error instanceof StaleElementReferenceError) {
                return null;
            }
            throw error;
        }

        if (elements.length < 3) {
            return null;
        }

        // Get price
        const priceElement = elements[0];
        let priceStr = await priceElement.getText();
        const textDecoration = await priceElement.getCssValue('text-decoration-line');

        if (textDecoration === 'line-through') {
            const newPrice: string = await this.driver!.executeScript(
                'return arguments[0].parentElement.parentElement.innerText;',
                priceElement
            );
            if (this.isPrice(newPrice)) {
                priceStr = newPrice;
            }
        }

        const price: number = Math.round(parseFloat(priceStr.replace(/[^0-9.]/g, '')));

        // Get location
        let location = '';
        location = await elements[1].getText();

        if (this.isPrice(location)) {
            if (elements.length <= 2) {
                return null;
            }
            location = await elements[2].getText();
        }

        // Get title
        let title = '';
        if (elements.length > 3) {
            title = await elements[2].getText();
        } else if (elements.length > 2) {
            title = await elements[1].getText();
        }

        // Get thumbnail image source
        let thumbnailSrc = '';
        try {
            const thumbnailElement = await listingElement.findElement(By.css('img'));
            thumbnailSrc = await thumbnailElement.getAttribute('src');
        } catch (error) {
            console.warn('Error getting thumbnail image source:', error);
        }

        return { price, title, location, thumbnailSrc };
    }

    private isPrice(text: string): boolean {
        return /^\d*([$€£])?\d*$/.test(text);
    }

    private hashListing(listing: ListingData): string {
        return crypto.createHash('sha256').update(JSON.stringify(listing)).digest('hex');
    }

    private async findMainScrollableContainer(): Promise<WebElement | null> {
        const script = `
      function findFirstYScrollableElement(minWidthPercent) {
          const elements = document.querySelectorAll('*');
          const minWidth = window.innerWidth * (minWidthPercent / 100);

          for (const element of elements) {
              const style = window.getComputedStyle(element);
              const overflowY = style.overflowY;
              const elementWidth = element.getBoundingClientRect().width;

              const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
              const hasMinWidth = elementWidth >= minWidth;
              const isOverflowing = element.scrollHeight > element.clientHeight;

              if (isScrollable && hasMinWidth && isOverflowing) {
                  return element;
              }
          }
          return null;
      }
      return findFirstYScrollableElement(30);
    `;
        const mainScrollableContainer = await this.driver!.executeScript(script);
        if (
            !mainScrollableContainer ||
            !(mainScrollableContainer instanceof WebElement)
        ) {
            return null;
        }
        return mainScrollableContainer;
    }

    private async getScrollPosition(): Promise<number> {
        const mainScrollableContainer = await this.findMainScrollableContainer();
        if (!mainScrollableContainer) {
            throw new Error('Could not find the main scrollable container.');
        }
        const scrollPosition = await this.driver!.executeScript(
            'return arguments[0].scrollTop;',
            mainScrollableContainer
        );
        if (typeof scrollPosition !== 'number') {
            throw new Error('Could not get the scroll position.');
        }
        return scrollPosition;
    }

    private async waitForListingLoad(): Promise<void> {
        const listingContainer = await this.driver!.findElement(
            By.xpath('//div[contains(@style, "max-width")]/div[@class]')
        );

        await this.driver!.wait(until.stalenessOf(listingContainer), 10000);

        await this.driver!.wait(
            until.elementLocated(
                By.xpath('//div[contains(@style, "max-width")]/div[@class]')
            ),
            10000
        );
    }

    private async waitForNewContent(previousListings: WebElement[]): Promise<boolean> {
        try {
            await this.driver!.wait(async () => {
                const newListingElements = await this.getListingElements();
                return newListingElements !== previousListings;
            }, 10000);
            return true;
        } catch (error) {
            if (error instanceof TimeoutError) {
                return false;
            }
            throw error;
        }
    }

    private async checkSeeMorePopup(wait: boolean = false): Promise<boolean> {
        let seeMorePopup: WebElement;
        try {
            if (wait) {
                seeMorePopup = await this.driver!.wait(
                    until.elementLocated(
                        By.xpath('//div[contains(., "See more on Facebook")]')
                    ),
                    10000
                );
            } else {
                seeMorePopup = await this.driver!.findElement(
                    By.xpath('//div[contains(., "See more on Facebook")]')
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
                By.xpath('.//div[@aria-label="Close" and @role="button"]')
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

    private async checkLoginPopup(wait: boolean = false): Promise<void> {
        let loginPopupText: WebElement;
        if (wait) {
            loginPopupText = await this.driver!.wait(
                until.elementLocated(
                    By.xpath('//span[contains(., "Log in or sign up for") and not(span)]')
                ),
                10000
            );
        } else {
            try {
                loginPopupText = await this.driver!.findElement(
                    By.xpath('//span[contains(., "Log in or sign up for") and not(span)]')
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
        const fixedParent: WebElement = await this.driver!.executeScript(
            script,
            loginPopupText
        );
        if (fixedParent) {
            await this.driver!.executeScript(
                'arguments[0].style.display = "none";',
                fixedParent
            );
        }
    }

    private async withPopupChecks(
        action: () => Promise<void>,
        wait: boolean = false
    ): Promise<void> {
        await this.checkSeeMorePopup(wait);
        await this.checkLoginPopup(wait);
        await action();
    }
}
