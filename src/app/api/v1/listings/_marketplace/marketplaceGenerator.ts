import { MarketplaceScraper } from '@/app/api/v1/listings/_marketplace/MarketplaceScraper';
import { Listing, ListingData, ListingSource } from '@/types/listings';
import { QueueManager } from '@/app/api/v1/listings/_database/QueueManager';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';
import { SearchCriteria } from '@/types/search';

async function* scraperGeneratorWithCache(
    isInPreviousOutput: (listing: ListingData) => boolean,
    scraper: MarketplaceScraper,
    searchQuery: string,
    searchCriteria?: SearchCriteria,
) {
    for await (const listingData of scraper.scrape()) {
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

export async function* marketplaceGenerator(
    scraper: MarketplaceScraper,
    processId: number,
    searchQuery: string,
    searchCriteria?: SearchCriteria,
) {
    const previousOutput: ListingData[] = [];
    for (const listingData of await scraper.fetchFirstListings()) {
        previousOutput.push(listingData);
        yield await DatabaseManager.addListing(
            listingData,
            searchQuery,
            ListingSource.Marketplace,
            searchCriteria,
        );
    }
    const isInPreviousOutput = (listing: ListingData | Listing) =>
        previousOutput.some((prevListing) => prevListing.url === listing.url);

    await QueueManager.waitUntilNextInLine(processId);

    // Check that there is still no cache for the search query
    const cachedListings = await DatabaseManager.getListings(searchQuery, searchCriteria);
    if (
        cachedListings !== null &&
        !(
            (await QueueManager.findQueueProcess(searchQuery, searchCriteria))?.status ===
            'processing'
        )
    ) {
        for (const listing of cachedListings) {
            yield listing;
        }
        await QueueManager.finishQueueProcess(processId);
        return;
    }

    let subGenerator: AsyncGenerator<Listing>;
    const existingProcess = await QueueManager.findQueueProcess(
        searchQuery,
        searchCriteria,
        processId,
    );
    if (existingProcess?.status === 'processing') {
        await scraper.cleanup();
        subGenerator = QueueManager.generateFromExisting(existingProcess.id);
    } else {
        subGenerator = scraperGeneratorWithCache(
            isInPreviousOutput,
            scraper,
            searchQuery,
            searchCriteria,
        );
    }
    for await (const listing of subGenerator) {
        if (isInPreviousOutput(listing)) {
            continue;
        }
        yield listing;
    }
    await QueueManager.finishQueueProcess(processId);
}
