export enum MarketplaceLocation {
    // Tallinn = '106039436102339',
    // Tartu = '106561152712690',
    // Parnu = '104076336295752',
    // Narva = '107067555990940',
    Paide = '106194046079577',
}

export type MarketplaceOptions = {
    query: string;
    location: MarketplaceLocation;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: {
        key: 'creation_time' | 'price' | 'distance';
        order: 'ascend' | 'descend';
    };
    itemCondition?: ('new' | 'used_like_new' | 'used_good' | 'used_fair')[];
    availability?: 'sold';
    daysSinceListed?: 1 | 7 | 30;
};
