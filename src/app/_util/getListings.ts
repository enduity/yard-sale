import { Listing as ListingModel } from '@/types/listings';
import { ReadableStream } from 'web-streams-polyfill';

/**
 * Get listings from the marketplace, given a search term.
 *
 * @param searchTerm
 * @returns A generator of listings
 */
export async function* getListings(searchTerm: string): AsyncGenerator<ListingModel[]> {
    const response = await fetch(`/api/v1/listings?query=${searchTerm}&location=Eesti`);
    const readableStream = response.body as ReadableStream<Uint8Array> | null;
    if (!readableStream) {
        throw new Error('Failed to fetch listings');
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
