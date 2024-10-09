import { WebDriver, WebElement } from 'selenium-webdriver';
import { TimeoutError } from 'selenium-webdriver/lib/error';
import { ListingData } from '@/types';
import { Navigator } from './Navigator';
import { PopupHandler } from './PopupHandler';
import { ListingExtractor } from './ListingExtractor';
import { ScrollManager } from './ScrollManager';
import { DriverManager } from './DriverManager';

export class FacebookMarketplaceScraper {
    private driverManager = new DriverManager();
    private driver: WebDriver | null = null;
    private processedListings = new Set<string>();
    private collectedData: Array<ListingData> = [];

    private navigator: Navigator | null = null;
    private popupHandler: PopupHandler | null = null;
    private listingExtractor: ListingExtractor | null = null;
    private scrollManager: ScrollManager | null = null;

    async init(): Promise<void> {
        this.driver = await this.driverManager.initDriver();
        await this.driver.manage().deleteAllCookies();
        const currentHandle = await this.driver.getWindowHandle();
        for (const handle of await this.driver.getAllWindowHandles()) {
            if (handle !== currentHandle) {
                await this.driver.switchTo().window(handle);
                await this.driver.close();
            }
        }
        await this.driver.switchTo().window(currentHandle);

        // Initialize other components
        this.navigator = new Navigator(this.driver);
        this.popupHandler = new PopupHandler(this.driver);
        this.listingExtractor = new ListingExtractor(this.driver);
        this.scrollManager = new ScrollManager(this.driver);
    }

    async close(): Promise<void> {
        await this.driverManager.closeDriver();
        this.driver = null;
        this.navigator = null;
        this.popupHandler = null;
        this.listingExtractor = null;
        this.scrollManager = null;
    }

    public async scrape(searchTerm: string): Promise<Array<ListingData>> {
        if (
            !this.driver ||
            !this.navigator ||
            !this.popupHandler ||
            !this.listingExtractor ||
            !this.scrollManager
        ) {
            throw new Error('Scraper not properly initialized.');
        }

        try {
            await this.navigator.navigateToMarketplace();
            await this.navigator.acceptCookies();

            const isCorrectLocation =
                await this.navigator.checkIfCorrectLocation('Ääsmäe');
            if (!isCorrectLocation) {
                await this.popupHandler.withPopupChecks(async () => {
                    await this.navigator!.setLocation('Ääsmäe', '65');
                }, true);
            }

            await this.popupHandler.withPopupChecks(async () => {
                await this.navigator!.performSearch(searchTerm);
            });

            await this.popupHandler.withPopupChecks(async () => {
                await this.scrollManager!.scrollAndCollectListings(
                    this.processListings.bind(this),
                    this.listingExtractor!.getListingElements.bind(this.listingExtractor),
                    this.popupHandler!.checkSeeMorePopup.bind(this.popupHandler),
                    this.waitForNewContent.bind(this)
                );
            });

            return this.collectedData;
        } catch (error) {
            console.error('Error during scraping:', error);
            throw error;
        }
    }

    private async processListings(listings: WebElement[]): Promise<void> {
        const maxConcurrency = 10;

        for (let i = 0; i < listings.length; i += maxConcurrency) {
            const batch = listings.slice(i, i + maxConcurrency);
            await Promise.all(
                batch.map(async (listing) => {
                    try {
                        const listingDetails =
                            await this.listingExtractor!.getListingDetails(listing);

                        if (!listingDetails) {
                            return;
                        }

                        const idHash = this.listingExtractor!.hashListing(listingDetails);

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

    private async waitForNewContent(previousListings: WebElement[]): Promise<boolean> {
        try {
            await this.driver!.wait(async () => {
                const newListingElements =
                    await this.listingExtractor!.getListingElements();
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
}
