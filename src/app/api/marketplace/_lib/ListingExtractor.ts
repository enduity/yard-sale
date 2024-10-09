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
        let priceStr = await priceElement.getText();
        const textDecoration = await priceElement.getCssValue('text-decoration-line');

        if (textDecoration === 'line-through') {
            const newPrice: string = await this.driver.executeScript(
                'return arguments[0].parentElement.parentElement.innerText;',
                priceElement
            );
            if (this.isPrice(newPrice)) {
                priceStr = newPrice;
            }
        }

        const price: number = Math.round(parseFloat(priceStr.replace(/[^0-9.]/g, '')));

        // Get location
        let location = await elements[1].getText();

        if (this.isPrice(location)) {
            if (elements.length <= 2) {
                return null;
            }
            location = await elements[2].getText();
        }

        // Get title
        let title = '';
        if (elements.length > 3) {
            title = await elements[3].getText();
        } else if (elements.length > 2) {
            title = await elements[2].getText();
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

    public hashListing(listing: ListingData): string {
        return crypto.createHash('sha256').update(JSON.stringify(listing)).digest('hex');
    }
}
