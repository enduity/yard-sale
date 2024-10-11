import { JsonContentType, ListingData, Edge, Node } from '@/types';

export function extractListingDetails(jsonContent: JsonContentType): ListingData[] {
    const listings: ListingData[] = [];

    // Navigate the JSON structure to reach the edges array
    const edges: Edge[] =
        jsonContent?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox
            ?.result?.data?.marketplace_search?.feed_units?.edges;

    if (edges && Array.isArray(edges)) {
        for (const edge of edges) {
            const node: Node = edge.node;
            if (
                node?.__typename === 'MarketplaceFeedListingStoryObject' &&
                node.listing
            ) {
                const listing = node.listing;

                // Extract the details
                const price = parseFloat(listing.listing_price?.amount) || -1;
                const title = listing.marketplace_listing_title || 'No title';
                const location =
                    listing.location?.reverse_geocode?.city_page?.display_name ||
                    'Unknown location';
                const thumbnailSrc = listing.primary_listing_photo?.image?.uri || '';
                const url = `https://www.facebook.com/marketplace/item/${listing.id}`;

                // Add the extracted details to the listings array
                listings.push({ price, title, location, thumbnailSrc, url });
            }
        }
    }

    return listings;
}
