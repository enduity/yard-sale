import { Listing as ListingModel } from '@/types/listings';
import { ReadableStream } from 'web-streams-polyfill';
import { GetListingsOptions } from '@/types/requests';
import { listingQueryUrl } from '@/app/_util/listingQueryUrl';
import { humanReadableTime } from '@/app/_util/humanReadableTime';
import { GetListingsError } from '@/app/_util/GetListingsError';

/**
 * Get listings from the marketplace, given a search query and optional filters.
 *
 * @param options - The search query and optional filter or sort options.
 * @returns A generator of listings
 */
export async function* getListings(
    options: GetListingsOptions,
): AsyncGenerator<ListingModel[]> {
    const response = await fetch(listingQueryUrl(options));
    if (!response.ok) {
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (!retryAfter) {
                throw new GetListingsError(
                    'Searched too quickly. ' +
                        'Please wait a few minutes before searching again.',
                );
            }
            const humanReadableRetryAfter = humanReadableTime(parseInt(retryAfter, 10));
            throw new GetListingsError(
                `Searched too quickly. ` +
                    `Please wait ${humanReadableRetryAfter} before searching again.`,
            );
        }
    }
    const readableStream = response.body as ReadableStream<Uint8Array> | null;
    if (!readableStream) {
        throw new GetListingsError('Failed to fetch listings: unknown error');
    }

    for await (const listingData of readableStream) {
        const decodedData = new TextDecoder().decode(listingData);
        console.log(decodedData);
        const jsonStrings = decodedData
            .split(/}(?={)/)
            .map((str, index, arr) => str + (index < arr.length - 1 ? '}' : ''));
        console.log(jsonStrings);
        const listings = jsonStrings.map((str) => JSON.parse(str));
        yield listings;
    }
}
