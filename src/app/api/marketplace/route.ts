import { NextRequest, NextResponse } from 'next/server';
import { FacebookMarketplaceScraper } from './_lib/FacebookMarketplaceScraper';
import { ListingData } from '@/types';

// Mock function to add listings to a cache
function mockAddToCache(listingData: ListingData) {
    console.log('Adding to cache:', listingData);
}

// Mock function to retrieve listings from a cache
function mockRetrieveFromCache(searchTerm: string): ListingData[] {
    // Simulate retrieving cached listings for the search term
    console.log('Retrieving from cache for:', searchTerm);
    // For this example, return an empty array
    return [];
}

export async function GET(req: NextRequest) {
    const accessErrorResponse = NextResponse.json(
        { error: 'Unable to access Facebook Marketplace. Try again later.' },
        { status: 500 }
    );

    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('searchTerm');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '8', 10);

    if (!searchTerm) {
        return NextResponse.json({ error: 'searchTerm is required' }, { status: 400 });
    }

    const scraper = new FacebookMarketplaceScraper();
    try {
        await scraper.init();

        // Retrieve from cache first
        const cachedListings = mockRetrieveFromCache(searchTerm);

        // If we have enough cached data, paginate it and return
        if (cachedListings.length && cachedListings.length >= (page - 1) * pageSize) {
            const paginatedListings = cachedListings.slice(
                (page - 1) * pageSize,
                page * pageSize
            );
            const hasMore = cachedListings.length > page * pageSize;
            return NextResponse.json({
                message: 'Cached search results',
                listings: paginatedListings,
                hasMore,
            });
        }

        // Fall back to scraping if cache is insufficient
        const listingGenerator = scraper.scrape(searchTerm);
        const listings: ListingData[] = [...cachedListings];
        let generatorError: unknown = null;
        let generatorDone = false;

        void (async () => {
            try {
                for await (const listingData of listingGenerator) {
                    listings.push(listingData);
                    mockAddToCache(listingData);
                }
            } catch (error) {
                generatorError = error;
            } finally {
                generatorDone = true;
                await scraper.close();
            }
        })();

        // Wait until we have enough data or an error occurs
        while (listings.length < page * pageSize && !generatorError && !generatorDone) {
            await new Promise((res) => setTimeout(res, 100));
        }

        if (generatorError) {
            console.error('Error during scraping:', generatorError);
            await scraper.close();
            return accessErrorResponse;
        }

        // Paginate the collected data
        const paginatedListings = listings.slice((page - 1) * pageSize, page * pageSize);
        const hasMore = listings.length > page * pageSize;

        return NextResponse.json({
            message: 'Search completed',
            listings: paginatedListings,
            hasMore,
        });
    } catch (error) {
        console.error('Error during scraping:', error);
        await scraper.close();
        return accessErrorResponse;
    }
}
