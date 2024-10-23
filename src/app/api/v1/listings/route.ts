import { NextRequest } from 'next/server';
import { ApiResponse } from '@/app/api/v1/_util/ApiResponse';
import { MarketplaceScraper } from '@/app/api/v1/listings/_marketplace/MarketplaceScraper';
import { findFirstInvalidOption, isValidRequestOptions } from '@/types/requests';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';
import { QueueManager } from '@/app/api/v1/listings/_database/QueueManager';
import { generatorToStream } from '@/app/api/v1/_util/generatorToStream';
import { OkidokiScraper } from '@/app/api/v1/listings/_okidoki/OkidokiScraper';
import { OstaFetcher } from '@/app/api/v1/listings/_osta/OstaFetcher';
import { SearchCriteria } from '@/types/search';
import { Listing } from '@/types/listings';
import { race } from '@/app/api/v1/_util/race';

export async function GET(req: NextRequest) {
    // Process the request URL
    const url = new URL(req.url);
    // Get all parameters as an object
    const rawParams = Object.fromEntries(url.searchParams.entries());

    const numeric = ['minPrice', 'maxPrice', 'maxDaysListed'];
    const params = Object.fromEntries(
        Object.entries(rawParams)
            .filter(([, value]) => value !== '')
            .map(([key, value]) => {
                const isNumeric = numeric.includes(key) && /^[\d.]+$/.test(value);
                return [key, isNumeric ? parseFloat(value) : value];
            }),
    );

    if (!isValidRequestOptions(params)) {
        return ApiResponse.invalidParameter(findFirstInvalidOption(params)!);
    }

    const searchCriteria: SearchCriteria = {
        maxDaysListed: params.maxDaysListed,
        condition: params.condition,
    };

    const cachedListings = await DatabaseManager.getListings(
        params.query,
        searchCriteria,
    );

    const alreadyExists = await QueueManager.findQueueProcess(
        params.query,
        searchCriteria,
    );
    if (cachedListings?.length && !(alreadyExists?.status === 'processing')) {
        return new Response(
            new ReadableStream({
                async pull(controller) {
                    for (const listing of cachedListings) {
                        const listingData = new TextEncoder().encode(
                            JSON.stringify(listing),
                        );
                        controller.enqueue(listingData);
                    }
                    controller.close();
                },
            }),
        );
    }

    const marketplaceScraper = await MarketplaceScraper.init(
        params.query,
        searchCriteria,
    );
    const marketplace = marketplaceScraper.scrapeWithCache();

    const okidokiScraper = new OkidokiScraper(params.query, searchCriteria);
    const okidoki = okidokiScraper.scrapeWithCache();

    const ostaFetcher = new OstaFetcher(params.query, searchCriteria);
    const osta = ostaFetcher.scrapeWithCache();

    const generator = (async function* () {
        yield* race<Listing>(marketplace, okidoki, osta);
    })();

    const streamGenerator = (async function* () {
        let count = 0;
        for await (const listing of generator) {
            if (count >= 200) {
                break;
            }
            const listingData = new TextEncoder().encode(JSON.stringify(listing));
            yield listingData;
            count++;
        }
    })();

    return new Response(generatorToStream(streamGenerator), {
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}
