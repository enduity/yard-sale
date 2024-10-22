import { Listing, ListingDataWithDate, ListingSource } from '@/types/listings';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';
import { SearchCriteria } from '@/types/search';
import initCycleTLS, { CycleTLSClient } from 'cycletls';

export abstract class BaseScraper {
    protected query: string;
    protected searchCriteria?: SearchCriteria;
    protected listingSource: ListingSource;

    protected constructor(
        query: string,
        listingSource: ListingSource,
        searchCriteria?: SearchCriteria,
    ) {
        this.query = query;
        this.searchCriteria = searchCriteria;
        this.listingSource = listingSource;
    }

    public async *scrapeWithCache(): AsyncGenerator<Listing> {
        for await (const listingData of this.scrape()) {
            if (
                this.searchCriteria?.maxDaysListed &&
                listingData.listedAt.getTime() <
                    Date.now() - this.searchCriteria.maxDaysListed * 24 * 60 * 60 * 1000
            ) {
                continue;
            }
            const listing = await DatabaseManager.addListing(
                listingData,
                this.query,
                this.listingSource,
                this.searchCriteria,
            );
            yield listing;
        }
    }

    protected async *scrape(): AsyncGenerator<ListingDataWithDate> {
        const cycleTLS = await initCycleTLS();
        try {
            yield* this.scrapeProcess(cycleTLS);
        } finally {
            await cycleTLS.exit();
        }
    }

    protected abstract scrapeProcess(
        cycleTLS: CycleTLSClient,
    ): AsyncGenerator<ListingDataWithDate>;
}
