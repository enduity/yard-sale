/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PreloadJsonContent {
    require: [
        [
            string,
            string,
            null,
            [
                {
                    __bbox: {
                        require: [
                            [
                                string,
                                string,
                                any[],
                                [
                                    string,
                                    {
                                        __bbox: {
                                            complete: boolean;
                                            result: {
                                                data: SearchData;
                                            };
                                        };
                                    },
                                ],
                            ],
                        ];
                    };
                },
            ],
        ],
    ];
}

export interface SingleItemJsonContent {
    require: [
        [
            string,
            string,
            null,
            [
                {
                    __bbox: {
                        require: [
                            any[],
                            any[],
                            any[],
                            [
                                string,
                                string,
                                any[],
                                [
                                    string,
                                    {
                                        __bbox: {
                                            complete: boolean;
                                            result: {
                                                data: SingleItemData;
                                            };
                                        };
                                    },
                                ],
                            ],
                        ];
                    };
                },
            ],
        ],
    ];
}

interface SingleItemData {
    viewer: {
        marketplace_product_details_page: {
            marketplace_listing_renderable_target: MarketplaceListingRenderableTarget;
            target: JsonListing;
        };
    };
}

export interface CatalogLoadJsonContent {
    data: SearchData;
}

interface MarketplaceListingRenderableTarget {
    location: {
        latitude: number;
        longitude: number;
    };
    is_shipping_offered: boolean;
    sweepstake_enabled: boolean;
    id: string;
    base_marketplace_listing_title: string;
    marketplace_listing_title: string;
}

interface SearchData {
    marketplace_search: MarketplaceSearch;
}

interface MarketplaceSearch {
    feed_units: FeedUnits;
}

interface FeedUnits {
    edges: Edge[];
    page_info: PageInfo;
}

export interface PageInfo {
    end_cursor: string;
    has_next_page: boolean;
}

export interface Edge {
    node: EdgeNode;
    cursor: null;
    __typename: string;
}

export interface EdgeNode {
    __typename: string;
    story_type: string;
    story_key: string;
    tracking: string;
    listing: JsonListing;
    id: string;
}

export interface JsonListing {
    __typename: string;
    id: string;
    primary_listing_photo: PrimaryListingPhoto;
    __isMarketplaceListingRenderable: string;
    listing_price: ListingPrice;
    strikethrough_price: null;
    __isMarketplaceListingWithComparablePrice: string;
    comparable_price: null;
    comparable_price_type: null;
    location: Location;
    is_hidden: boolean;
    is_live: boolean;
    is_pending: boolean;
    is_sold: boolean;
    is_viewer_seller: boolean;
    min_listing_price: null;
    max_listing_price: null;
    marketplace_listing_category_id: string;
    marketplace_listing_title: string;
    custom_title: null;
    custom_sub_titles_with_rendering_flags: any[];
    origin_group: null;
    listing_video: null;
    __isMarketplaceListingWithChildListings: string;
    parent_listing: null;
    marketplace_listing_seller: null;
    __isMarketplaceListingWithDeliveryOptions: string;
    delivery_types: string[];
}

interface PrimaryListingPhoto {
    __typename: string;
    image: Image;
    id: string;
}

interface Image {
    uri: string;
}

interface ListingPrice {
    formatted_amount: string;
    amount_with_offset_in_currency: string;
    amount: string;
}

interface Location {
    reverse_geocode: ReverseGeocode;
}

interface ReverseGeocode {
    city: string;
    state: string;
    city_page: CityPage;
}

interface CityPage {
    display_name: string;
    id: string;
}
