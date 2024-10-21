import {
    CatalogLoadJsonContent,
    Edge,
    JsonListing,
    PreloadJsonContent,
    SingleItemJsonContent,
} from '@/types/marketplaceJson';
import { ListingData } from '@/types/listings';
import { EdgeNode } from '@/types/marketplaceJson';

export enum JsonType {
    singleItem = 'singleItem',
    preload = 'preload',
    catalogLoad = 'catalogLoad',
}

export class JsonProcessor {
    private readonly jsonString: string;
    private readonly jsonType: JsonType;

    constructor(jsonString: string, jsonType: JsonType) {
        this.jsonString = jsonString;
        this.jsonType = jsonType;
    }

    getListingData(): ListingData[] {
        const jsonContent = JSON.parse(this.jsonString);
        switch (this.jsonType) {
            case JsonType.singleItem:
                return this.getSingleItemListingData(
                    jsonContent as SingleItemJsonContent,
                );
            case JsonType.preload:
            case JsonType.catalogLoad:
                return this.getMultipleListingData(jsonContent);
        }
    }

    private getSingleItemListingData(jsonContent: SingleItemJsonContent): ListingData[] {
        const jsonListing: JsonListing =
            jsonContent.require[0][3][0].__bbox.require[3][3][1].__bbox.result.data.viewer
                .marketplace_product_details_page.target;
        return [this.extractListingDetails(jsonListing)];
    }

    private getMultipleListingData(
        jsonContent: PreloadJsonContent | CatalogLoadJsonContent,
    ): ListingData[] {
        let edges: Edge[] = [];
        try {
            edges = this.extractEdges(jsonContent);
        } catch (error) {
            if (error instanceof TypeError) {
                return [];
            }
            throw error;
        }

        const listings: ListingData[] = [];
        for (const edge of edges) {
            try {
                const node: EdgeNode = edge.node;
                const listing = node.listing;
                if (listing === undefined) {
                    continue;
                }
                listings.push(this.extractListingDetails(listing));
            } catch (error) {
                if (error instanceof TypeError) {
                    console.log('Skipping edge because of TypeError:', error.message);
                    continue;
                }
                throw error;
            }
        }
        return listings;
    }

    private extractEdges(
        jsonContent: PreloadJsonContent | CatalogLoadJsonContent,
    ): Edge[] {
        switch (this.jsonType) {
            case JsonType.preload:
                return this.getEdgesFromPreload(jsonContent as PreloadJsonContent);
            case JsonType.catalogLoad:
                return this.getEdgesFromCatalogLoad(
                    jsonContent as CatalogLoadJsonContent,
                );
            default:
                return [];
        }
    }

    private getEdgesFromPreload(jsonContent: PreloadJsonContent): Edge[] {
        try {
            return jsonContent.require[0][3][0].__bbox.require[0][3][1].__bbox.result.data
                .marketplace_search.feed_units.edges;
        } catch (error) {
            if (error instanceof TypeError) {
                return [];
            }
            throw error;
        }
    }

    private getEdgesFromCatalogLoad(jsonContent: CatalogLoadJsonContent): Edge[] {
        try {
            return jsonContent.data.marketplace_search.feed_units.edges;
        } catch (error) {
            if (error instanceof TypeError) {
                return [];
            }
            throw error;
        }
    }

    extractListingDetails(listing: JsonListing): ListingData {
        const price = parseFloat(listing.listing_price?.amount) ?? -1;
        const title = listing.marketplace_listing_title || '';
        const location = listing.location?.reverse_geocode?.city_page?.display_name || '';
        const thumbnailSrc = listing.primary_listing_photo?.image?.uri || '';
        const url = `https://www.facebook.com/marketplace/item/${listing.id}`;

        return {
            price,
            title,
            location,
            thumbnailSrc,
            url,
        };
    }

    static isPreloadJsonString(input: string): boolean {
        return input.includes('__isMarketplaceListingRenderable');
    }
}
