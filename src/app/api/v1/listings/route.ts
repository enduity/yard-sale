import { NextRequest } from 'next/server';
import { ApiResponse } from '@/app/api/v1/_util/ApiResponse';
import { MarketplaceScraper } from '@/app/api/v1/listings/_marketplace/MarketplaceScraper';
import { MarketplaceLocation } from '@/types/marketplace';
import { findFirstInvalidOption, isValidRequestOptions } from '@/types/requests';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';
import { QueueManager } from '@/app/api/v1/listings/_database/QueueManager';
import { marketplaceGenerator } from '@/app/api/v1/listings/_marketplace/marketplaceGenerator';
import { generatorToStream } from '@/app/api/v1/_util/generatorToStream';

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

    const cachedListings = await DatabaseManager.getListings(
        params.query,
        params.maxDaysListed,
    );

    const alreadyExists = await QueueManager.findQueueProcess(
        params.query,
        params.maxDaysListed,
    );
    if (cachedListings !== null && !(alreadyExists?.status === 'processing')) {
        return new ReadableStream({
            async pull(controller) {
                for (const listing of cachedListings) {
                    const listingData = new TextEncoder().encode(JSON.stringify(listing));
                    controller.enqueue(listingData);
                }
                controller.close();
            },
        });
    }

    const processId = await QueueManager.addToQueue(params.query, params.maxDaysListed);

    const options = {
        query: params.query,
        location: MarketplaceLocation.Paide,
        radius: 200,
    };
    const marketplaceScraper = new MarketplaceScraper(options);

    const generator = marketplaceGenerator(
        marketplaceScraper,
        processId,
        params.query,
        params.maxDaysListed,
    );

    const streamGenerator = (async function* () {
        for await (const listing of generator) {
            const listingData = new TextEncoder().encode(JSON.stringify(listing));
            yield listingData;
        }
    })();

    return new Response(generatorToStream(streamGenerator), {
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}
