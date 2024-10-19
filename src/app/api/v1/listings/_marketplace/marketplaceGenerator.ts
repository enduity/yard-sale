import { MarketplaceScraper } from '@/app/api/v1/listings/_marketplace/MarketplaceScraper';
import { Listing, ListingData, ListingSource } from '@/types/listings';
import { QueueManager } from '@/app/api/v1/listings/_database/QueueManager';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';

async function* scraperGeneratorWithCache(
    isInPreviousOutput: (listing: ListingData) => boolean,
    scraper: MarketplaceScraper,
    searchQuery: string,
    maxDaysListed: number | undefined,
) {
    for await (const listingData of scraper.scrape()) {
        if (isInPreviousOutput(listingData)) {
            continue;
        }
        yield await DatabaseManager.addListing(
            listingData,
            searchQuery,
            ListingSource.Marketplace,
            maxDaysListed,
        );
    }
}

export async function* marketplaceGenerator(
    scraper: MarketplaceScraper,
    processId: number,
    searchQuery: string,
    maxDaysListed: number | undefined,
) {
    const previousOutput: ListingData[] = [];
    for (const listingData of await scraper.fetchFirstListings()) {
        previousOutput.push(listingData);
        yield await DatabaseManager.addListing(
            listingData,
            searchQuery,
            ListingSource.Marketplace,
            maxDaysListed,
        );
    }
    const isInPreviousOutput = (listing: ListingData | Listing) =>
        previousOutput.some((prevListing) => prevListing.url === listing.url);

    await QueueManager.waitUntilNextInLine(processId);

    // Check that there is still no cache for the search query
    const cachedListings = await DatabaseManager.getListings(searchQuery, maxDaysListed);
    if (
        cachedListings !== null &&
        !(
            (await QueueManager.findQueueProcess(searchQuery, maxDaysListed))?.status ===
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
        maxDaysListed,
        processId,
    );
    if (existingProcess?.status === 'processing') {
        subGenerator = QueueManager.generateFromExisting(existingProcess.id);
    } else {
        subGenerator = scraperGeneratorWithCache(
            isInPreviousOutput,
            scraper,
            searchQuery,
            maxDaysListed,
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
