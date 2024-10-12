import { axiosInstance } from '@/lib/axiosInstance';
import { JSDOM } from 'jsdom';
import { JsonContentType, ListingData } from '@/types';
import { extractListingDetails } from './extractListingDetails';

export enum Location {
    Tallinn = '106039436102339',
    Tartu = '106561152712690',
    Parnu = '104076336295752',
    Narva = '107067555990940',
}

export const LocationNames: Record<Location, string> = {
    [Location.Tallinn]: 'Tallinn',
    [Location.Tartu]: 'Tartu',
    [Location.Parnu]: 'Pärnu',
    [Location.Narva]: 'Narva',
};

type MarketPlaceOptions = {
    query: string;
    location: Location;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: {
        key: 'creation_time' | 'price' | 'distance';
        order: 'ascend' | 'descend';
    };
    itemCondition?: ('new' | 'used_like_new' | 'used_good' | 'used_fair')[];
    availability?: undefined | 'sold';
    daysSinceListed?: undefined | 1 | 7 | 30;
};

function urlGenerator(options: MarketPlaceOptions): string {
    const {
        query,
        location,
        radius,
        minPrice,
        maxPrice,
        sortBy,
        itemCondition,
        availability,
        daysSinceListed,
    } = options;
    const url = new URL(`https://www.facebook.com/marketplace/${location}/search`);
    url.searchParams.append('query', query);
    if (radius) url.searchParams.append('radius', String(radius));
    if (minPrice) url.searchParams.append('min_price', String(minPrice));
    if (maxPrice) url.searchParams.append('max_price', String(maxPrice));
    if (sortBy) {
        url.searchParams.append('sort_by', sortBy.key);
        url.searchParams.append('sort_order', sortBy.order);
    }
    if (itemCondition) url.searchParams.append('item_condition', itemCondition.join(','));
    if (availability) url.searchParams.append('availability', availability);
    if (daysSinceListed)
        url.searchParams.append('days_since_listed', String(daysSinceListed));
    return url.toString();
}

export async function fetchFirstListings(
    options: MarketPlaceOptions,
): Promise<ListingData[]> {
    const url = urlGenerator(options);

    const response = await axiosInstance.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            Accept: 'text/html',
            'Sec-Fetch-Mode': 'navigate',
        },
    });
    const htmlContent = response.data;

    const dom = new JSDOM(htmlContent);
    const scriptTags = dom.window.document.querySelectorAll(
        'script[type="application/json"]',
    );

    for (const scriptTag of scriptTags) {
        let jsonContent: JsonContentType | null = null;
        let detectorValue: string | undefined;
        try {
            jsonContent = JSON.parse(scriptTag.textContent || '');

            detectorValue =
                jsonContent?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[0];
        } catch (error) {
            if (error instanceof TypeError) {
                continue;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to parse JSON content:', errorMessage);
        }

        if (
            detectorValue !== undefined &&
            jsonContent !== null &&
            detectorValue.includes('SearchContentContainerQueryRelayPreloader')
        ) {
            return extractListingDetails(jsonContent);
        }
    }

    console.warn('Failed to extract any listings');
    return [];
}
