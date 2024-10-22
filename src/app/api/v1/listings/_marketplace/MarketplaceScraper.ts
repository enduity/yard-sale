// Import necessary modules and types
import { Browser } from '@/app/api/v1/listings/_marketplace/Browser';
import { Listing, ListingData, ListingSource } from '@/types/listings';
import {
    MarketplaceLocation,
    MarketplaceOptions,
    MarketplaceScraperOptions,
} from '@/types/marketplace';
import { urlGenerator } from '@/app/api/v1/listings/_marketplace/urlGenerator';
import { axiosInstance } from '@/lib/axiosInstance';
import { JSDOM } from 'jsdom';
import {
    JsonProcessor,
    JsonType,
} from '@/app/api/v1/listings/_marketplace/JsonProcessor';
import { HTTPRequest, Page, TimeoutError } from 'puppeteer';
import { ScrollManager } from '@/app/api/v1/listings/_marketplace/ScrollManager';
import { PopupHandler } from '@/app/api/v1/listings/_marketplace/PopupHandler';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';
import { QueueManager } from '@/app/api/v1/listings/_database/QueueManager';
import { Condition, SearchCriteria } from '@/types/search';

export class MarketplaceScraper {
    private browser?: Browser;
    private readonly query: string;
    private readonly searchCriteria?: SearchCriteria;
    private processId?: number;
    private readonly options: MarketplaceScraperOptions;
    private readonly requestOptions: MarketplaceOptions;

    private constructor(
        query: string,
        searchCriteria?: SearchCriteria,
        options?: MarketplaceScraperOptions,
    ) {
        this.query = query;
        this.searchCriteria = searchCriteria;
        if (!options) {
            this.options = {
                location: MarketplaceLocation.Paide,
                radius: 200,
            };
        } else {
            this.options = options;
        }
        this.requestOptions = this.getConfiguration();
    }

    public static async init(
        query: string,
        searchCriteria?: SearchCriteria,
        options?: MarketplaceScraperOptions,
    ): Promise<MarketplaceScraper> {
        const scraper = new MarketplaceScraper(query, searchCriteria, options);
        scraper.processId = await QueueManager.addToQueue(query, searchCriteria);
        return scraper;
    }

    private getConfiguration(): MarketplaceOptions {
        let condition: MarketplaceOptions['itemCondition'];
        if (this.searchCriteria?.condition === Condition.New) {
            condition = ['new'];
        } else if (this.searchCriteria?.condition === Condition.Used) {
            condition = ['used_like_new', 'used_good', 'used_fair'];
        }

        return {
            query: this.query,
            location: this.options.location,
            radius: this.options.radius,
            daysSinceListed: this.searchCriteria?.maxDaysListed,
            itemCondition: condition,
        };
    }

    private async *scrape(): AsyncGenerator<ListingData> {
        yield* this.browser!.usePage<ListingData>(
            urlGenerator(this.requestOptions),
            { waitUntil: 'networkidle0' },
            this.handlePage.bind(this),
        );
    }

    public async cleanup(): Promise<void> {
        await this.browser?.close();
    }

    private async fetchFirstListings(): Promise<ListingData[]> {
        const url = urlGenerator(this.requestOptions);

        const response = await axiosInstance.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                Accept: 'text/html',
                'Sec-Fetch-Mode': 'navigate',
            },
        });
        const htmlContent = response.data;

        const dom = new JSDOM(htmlContent);
        const scriptTags = dom.window.document.querySelectorAll(
            'script[type="application/json"]',
        );

        let listingDetails: ListingData[] = [];
        for (const scriptTag of scriptTags) {
            const textContent = scriptTag.textContent;
            if (textContent && JsonProcessor.isPreloadJsonString(textContent)) {
                const processor = new JsonProcessor(textContent, JsonType.preload);
                const tagListingDetails: ListingData[] = processor.getListingData();
                listingDetails = [...listingDetails, ...tagListingDetails];
                listingDetails = listingDetails.reduce<ListingData[]>((acc, listing) => {
                    if (!acc.some((accListing) => accListing.url === listing.url)) {
                        return [...acc, listing];
                    }
                    return acc;
                }, []);
            }
        }
        return listingDetails;
    }

    private async *handlePage(page: Page): AsyncGenerator<ListingData> {
        const scrollManager = new ScrollManager(page);
        const popupHandler = new PopupHandler(page);

        await popupHandler.acceptCookies();
        await popupHandler.checkSeeMorePopup();
        await popupHandler.checkLoginPopup();

        const listingGenerator = scrollManager.scrollAndCollectListings(
            this.processListings.bind(this),
            popupHandler.checkSeeMorePopup.bind(popupHandler),
            this.waitForListingLoadPost.bind(this, page),
        );

        for await (const listingData of listingGenerator) {
            yield listingData;
        }
    }

    private async processListings(jsonString: string): Promise<ListingData[]> {
        const jsonProcessor = new JsonProcessor(jsonString, JsonType.catalogLoad);
        return jsonProcessor.getListingData();
    }

    private async waitForListingLoadPost(page: Page): Promise<HTTPRequest | null> {
        try {
            return await Promise.race([
                new Promise<HTTPRequest | null>((resolve) => {
                    page.on('requestfinished', (request) => {
                        if (
                            request.method() === 'POST' &&
                            request.url().includes('graphql/') &&
                            request
                                ?.postData()
                                ?.includes(
                                    'fb_api_req_friendly_name=CometMarketplaceSearchContentPaginationQuery',
                                )
                        ) {
                            resolve(request);
                        }
                    });
                }),
                new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new TimeoutError('Request timed out')), 5000),
                ),
            ]);
        } catch (error) {
            if (error instanceof TimeoutError) {
                return null;
            }
            throw error;
        }
    }

    public async *scrapeWithCache(): AsyncGenerator<Listing> {
        const previousOutput: ListingData[] = [];

        // Fetch initial listings and add to previous output
        for (const listingData of await this.fetchFirstListings()) {
            previousOutput.push(listingData);
            yield await DatabaseManager.addListing(
                listingData,
                this.query,
                ListingSource.Marketplace,
                this.searchCriteria,
            );
        }

        const isInPreviousOutput = (listing: ListingData | Listing) =>
            previousOutput.some((prevListing) => prevListing.url === listing.url);

        // Wait until it's this process's turn
        await QueueManager.waitUntilNextInLine(this.processId!);

        this.browser = new Browser();

        const existingProcess = await QueueManager.findQueueProcess(
            this.query,
            this.searchCriteria,
            this.processId!,
        );

        let subGenerator: AsyncGenerator<Listing>;
        if (existingProcess?.status === 'processing') {
            await this.cleanup();
            subGenerator = QueueManager.generateFromExisting(existingProcess.id);
        } else {
            subGenerator = this.scraperGeneratorWithCache(
                isInPreviousOutput,
                this.query,
                this.searchCriteria,
            );
        }

        // Yield new listings
        for await (const listing of subGenerator) {
            if (isInPreviousOutput(listing)) {
                continue;
            }
            yield listing;
        }
        await QueueManager.finishQueueProcess(this.processId!);
    }

    private async *scraperGeneratorWithCache(
        isInPreviousOutput: (listing: ListingData | Listing) => boolean,
        searchQuery: string,
        searchCriteria?: SearchCriteria,
    ): AsyncGenerator<Listing> {
        for await (const listingData of this.scrape()) {
            if (isInPreviousOutput(listingData)) {
                continue;
            }
            yield await DatabaseManager.addListing(
                listingData,
                searchQuery,
                ListingSource.Marketplace,
                searchCriteria,
            );
        }
    }
}
