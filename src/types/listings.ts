import { Prisma } from '@prisma/client';

export interface ListingData {
    price: number;
    title: string;
    location: string;
    thumbnailSrc: string;
    url: string;
}

export interface ListingDataWithDate extends ListingData {
    listedAt: Date;
}

export enum ListingSource {
    Marketplace = 'marketplace',
    Okidoki = 'okidoki',
    OstaEE = 'ostaee',
}

export interface Listing {
    price: Prisma.Decimal;
    title: string;
    location: string;
    thumbnail?: Buffer;
    thumbnailId?: number;
    url: string;
    source: ListingSource;
}
