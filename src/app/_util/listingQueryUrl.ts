import { GetListingsOptions } from '@/types/requests';

export function listingQueryUrl(getListingsOptions: GetListingsOptions): string {
    const base = '/api/v1/listings';

    // Default location is Eesti for now
    const queryParams: Record<string, string> = {
        location: 'Eesti',
    };
    // Add all defined options to the query string
    for (const [key, value] of Object.entries(getListingsOptions)) {
        if (value !== undefined) {
            queryParams[key] = value.toString();
        }
    }

    const getEncodedEntry = ([key, value]: [string, string]) => {
        const encodedKey = encodeURIComponent(key);
        return `${encodedKey}=${encodeURIComponent(value).replace(/%20/g, '+')}`;
    };

    const queryString = Object.entries(queryParams).map(getEncodedEntry).join('&');

    return `${base}?${queryString}`;
}
