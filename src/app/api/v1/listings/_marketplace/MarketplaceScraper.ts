import { Browser } from '@/app/api/v1/listings/_marketplace/Browser';
import { ListingData } from '@/types/listings';
import { MarketplaceOptions } from '@/types/marketplace';
import { urlGenerator } from '@/app/api/v1/listings/_marketplace/urlGenerator';
import { axiosInstance } from '@/lib/axiosInstance';
import { JSDOM } from 'jsdom';
import {
    JsonProcessor,
    JsonType,
} from '@/app/api/v1/listings/_marketplace/JsonProcessor';
import { HTTPRequest, Page } from 'puppeteer';
import { ScrollManager } from '@/app/api/v1/listings/_marketplace/ScrollManager';
import { PopupHandler } from '@/app/api/v1/listings/_marketplace/PopupHandler';
import { TimeoutError } from 'puppeteer';

export class MarketplaceScraper {
    private browser: Browser;
    private readonly options: MarketplaceOptions;

    constructor(options: MarketplaceOptions) {
        this.browser = new Browser();
        this.options = options;
    }

    public async *scrape(): AsyncGenerator<ListingData> {
        yield* this.browser.usePage<ListingData>(
            urlGenerator(this.options),
            { waitUntil: 'networkidle0' },
            this.handlePage.bind(this),
        );
    }

    public async cleanup(): Promise<void> {
        await this.browser.close();
    }

    public async fetchFirstListings(): Promise<ListingData[]> {
        const url = urlGenerator(this.options);

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

    public async *handlePage(page: Page): AsyncGenerator<ListingData> {
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

    async waitForListingLoadPost(page: Page): Promise<HTTPRequest | null> {
        try {
            const request = await new Promise<HTTPRequest | null>((resolve) => {
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
            });
            console.log('POST request to graphql/ with the expected form data detected');
            return request;
        } catch (error) {
            if (error instanceof TimeoutError) {
                return null;
            }
            throw error;
        }
    }
}
