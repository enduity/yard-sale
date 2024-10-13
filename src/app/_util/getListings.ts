import { Listing as ListingModel } from '@/types/listings';

// Fix for TypeScript not understanding the polyfill below
declare global {
    interface ReadableStream<R> {
        [Symbol.asyncIterator](): AsyncIterableIterator<R>;
    }
}

/**
 * Polyfill to make ReadableStream iterable with for-await-of
 */
ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
    const reader = this.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) return;
            yield value;
        }
    } finally {
        reader.releaseLock();
    }
};

/**
 * Get listings from the marketplace, given a search term.
 *
 * @param searchTerm
 * @returns A generator of listings
 */
export async function* getListings(searchTerm: string): AsyncGenerator<ListingModel[]> {
    const response = await fetch(`/api/v1/listings?query=${searchTerm}&location=Eesti`);

    const readableStream: ReadableStream<Uint8Array> | null = response.body;
    if (!readableStream) {
        throw new Error('Failed to get listings');
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
