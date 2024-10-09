import { NextRequest, NextResponse } from 'next/server';
import { FacebookMarketplaceScraper } from './_lib/FacebookMarketplaceScraper';
import { ListingData } from '@/types';

// Mock function to add listings to a cache
function mockAddToCache(listingData: ListingData) {
    // Simulate adding listingData to a cache
    console.log('Adding to cache:', listingData);
}

export async function POST(req: NextRequest) {
    const accessErrorResponse = NextResponse.json(
        { error: 'Unable to access Facebook Marketplace. Try again later.' },
        { status: 500 }
    );

    const { searchTerm } = await req.json();

    const scraper = new FacebookMarketplaceScraper();
    try {
        await scraper.init();

        const listingGenerator = scraper.scrape(searchTerm);

        const firstListings: ListingData[] = [];
        let count = 0;
        let generatorError: unknown = null;
        let generatorDone = false;

        // Start processing the generator in the background
        const processingPromise = (async () => {
            try {
                for await (const listingData of listingGenerator) {
                    if (count < 8) {
                        firstListings.push(listingData);
                        count++;
                    } else {
                        // Process remaining listings
                        mockAddToCache(listingData);
                    }
                }
            } catch (error) {
                generatorError = error;
            } finally {
                generatorDone = true;
                await scraper.close();
            }
        })();

        // Wait until we have at least 8 listings or an error occurs
        while (firstListings.length < 8 && !generatorError && !generatorDone) {
            await new Promise((res) => setTimeout(res, 100));
        }

        if (generatorError) {
            throw generatorError;
        }

        // Send the response with the first 8 listings
        return NextResponse.json({
            message: 'Search completed',
            listings: firstListings,
        });

        // Note: The generator continues processing in the background
    } catch (error) {
        console.error('Error during scraping:', error);
        await scraper.close();
        return accessErrorResponse;
    }
}

export function GET() {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
