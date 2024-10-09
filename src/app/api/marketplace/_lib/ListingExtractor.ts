import { WebDriver, WebElement, By } from 'selenium-webdriver';
import { StaleElementReferenceError } from 'selenium-webdriver/lib/error';
import { ListingData } from '@/types';
import crypto from 'crypto';

export class ListingExtractor {
    private driver: WebDriver;

    constructor(driver: WebDriver) {
        this.driver = driver;
    }

    public async getListingElements(): Promise<WebElement[]> {
        const listingCssSelector =
            'div[style*="max-width"] > div[class] > div[class] a:has(span:not(:empty))';
        return await this.driver.findElements(By.css(listingCssSelector));
    }

    public async getListingDetails(
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
        const priceStr = await priceElement.getText();
        const price: number = Math.round(parseFloat(priceStr.replace(/[^0-9.]/g, '')));

        // Get location and title
        let location = '';
        let title = '';

        const secondElement = await elements[1].getText();
        const elementCount = elements.length;

        // If the second element is a price, it is the struck out original price
        if (this.isPrice(secondElement)) {
            if (elementCount >= 4) {
                location = await elements[3].getText();
                title = await elements[2].getText();
            } else if (elementCount >= 3) {
                // No title in this case
                location = await elements[2].getText();
            } else {
                // Should not be possible
                return null;
            }
        } else {
            if (elementCount >= 3) {
                location = await elements[2].getText();
                title = secondElement;
            } else if (elementCount >= 2) {
                location = secondElement;
            }
        }

        // Get thumbnail image source
        let thumbnailSrc = '';
        try {
            const thumbnailElement = await listingElement.findElement(By.css('img'));
            thumbnailSrc = await thumbnailElement.getAttribute('src');
        } catch (error) {
            console.warn('Error getting thumbnail image source:', error);
        }

        // Get the listing URL
        let url = '';
        try {
            url = await listingElement.getAttribute('href');
        } catch (error) {
            console.warn('Error getting listing URL:', error);
        }

        return { price, title, location, thumbnailSrc, url };
    }

    private isPrice(text: string): boolean {
        return /^[\d,]*([$€£])?[\d,]*$/.test(text);
    }

    public hashListing(listing: ListingData): string {
        return crypto.createHash('sha256').update(JSON.stringify(listing)).digest('hex');
    }
}
