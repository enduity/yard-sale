import { MarketplaceOptions } from '@/types/marketplace';

export function urlGenerator(options: MarketplaceOptions): string {
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
    if (minPrice) params['minPrice'] = String(minPrice);
    if (maxPrice) params['maxPrice'] = String(maxPrice);
    if (sortBy) {
        params['sortBy'] = sortBy.key;
        params['sortOrder'] = sortBy.order;
    }
    if (itemCondition) params['itemCondition'] = itemCondition.join(',');
    if (availability) params['availability'] = availability;
    if (daysSinceListed) params['daysSinceListed'] = String(daysSinceListed);

    const queryString = Object.keys(params)
        .map((key) => {
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(params[key]).replace(/%20/g, '+');
            return `${encodedKey}=${encodedValue}`;
        })
        .join('&');

    return `${baseUrl}?${queryString}`;
}
