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

    const baseUrl = `https://www.facebook.com/marketplace/${location}/search`;
    const params: { [key: string]: string } = {};

    params['query'] = query;
    if (radius) params['radius'] = String(radius);
    if (minPrice) params['min_price'] = String(minPrice);
    if (maxPrice) params['max_price'] = String(maxPrice);
    if (sortBy) {
        params['sort_by'] = sortBy.key;
        params['sort_order'] = sortBy.order;
    }
    if (itemCondition) params['item_condition'] = itemCondition.join(',');
    if (availability) params['availability'] = availability;
    if (daysSinceListed) params['days_since_listed'] = String(daysSinceListed);

    const queryString = Object.keys(params)
        .map((key) => {
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(params[key]).replace(/%20/g, '+');
            return `${encodedKey}=${encodedValue}`;
        })
        .join('&');

    return `${baseUrl}?${queryString}`;
}

export async function fetchFirstListings(
    options: MarketPlaceOptions,
): Promise<ListingData[]> {
    const url = urlGenerator(options);
    console.log('Fetching listings from:', url);

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

    let listingDetails: ListingData[] = [];
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
            const tagListingDetails: ListingData[] = extractListingDetails(jsonContent);
            listingDetails = [...listingDetails, ...tagListingDetails];
            listingDetails = listingDetails.reduce<ListingData[]>((acc, listing) => {
                if (!acc.some((accListing) => accListing.url === listing.url)) {
                    return [...acc, listing];
                }
                return acc;
            }, []);
        }
    }
    if (listingDetails.length > 0) {
        return listingDetails;
    }

    console.warn('Failed to extract any listings');
    return [];
}
