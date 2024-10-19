import { prisma } from '@/lib/prisma';
import { axiosInstance } from '@/lib/axiosInstance';
import { Listing, ListingData, ListingSource } from '@/types/listings';
import { Prisma } from '@prisma/client';

export class DatabaseManager {
    private static readonly STALE_SEARCH_MS = 60 * 60 * 1000;
    private static readonly BACKGROUND_TASK_BETWEEN_MS = 60 * 1000;
    private static lastBackgroundTaskTime = Date.now() - 60 * 1000;

    static async addOrGetSearch(searchQuery: string, maxDaysListed?: number) {
        const existingSearch = await prisma.search.findFirst({
            where: {
                query: searchQuery,
                maxDaysListed: maxDaysListed,
            },
        });

        if (!existingSearch) {
            return prisma.search.create({ data: { query: searchQuery, maxDaysListed } });
        }
        return existingSearch;
    }

    public static async addListing(
        listingData: ListingData,
        searchQuery: string,
        source: ListingSource,
        maxDaysListed?: number,
    ): Promise<Listing> {
        const imageBuffer = await this.bufferFromImageUrl(listingData.thumbnailSrc);

        // First, add the search term (if it doesn't exist)
        const search = await this.addOrGetSearch(searchQuery, maxDaysListed);
        // Check if the listing already exists
        const existingListing = await prisma.listing.findFirst({
            where: { url: listingData.url, searchId: search.id },
            include: { thumbnail: true },
        });
        if (existingListing) {
            return {
                price: existingListing.price,
                title: existingListing.title,
                location: existingListing.location,
                thumbnailId: existingListing.thumbnail?.id,
                url: existingListing.url,
                source: existingListing.source as ListingSource,
            };
        }
        // Add the listing
        const listing = await prisma.listing.create({
            data: {
                price: new Prisma.Decimal(listingData.price),
                title: listingData.title,
                location: listingData.location,
                url: listingData.url,
                searchId: search.id,
                source,
            },
        });
        if (imageBuffer) {
            await prisma.thumbnail.create({
                data: {
                    image: imageBuffer,
                    Listing: { connect: { id: listing.id } },
                },
            });
        }
        const result = prisma.listing.findFirstOrThrow({
            where: { id: listing.id },
            include: { thumbnail: true },
        });
        return Promise.resolve(
            result.then((r) => ({
                price: r.price,
                title: r.title,
                location: r.location,
                thumbnailId: r.thumbnail?.id,
                url: r.url,
                source: r.source as ListingSource,
            })),
        );
    }

    public static async getListings(
        searchQuery: string,
        maxDaysListed?: number,
    ): Promise<Listing[] | null> {
        const searches = await prisma.search.findMany({
            where: {
                query: searchQuery,
                maxDaysListed: maxDaysListed,
            },
            include: { results: { include: { thumbnail: true } } },
        });

        if (!searches) {
            return null;
        }

        for (const search of searches) {
            if (Date.now() - search.time.getTime() > this.STALE_SEARCH_MS) {
                await prisma.search.delete({ where: { id: search.id } });
                return null;
            }
        }

        void this.startBackgroundTasks();

        let listings: Listing[] = [];
        for (const search of searches) {
            listings = [
                ...listings,
                ...search.results.map((result) => ({
                    price: result.price,
                    title: result.title,
                    location: result.location,
                    thumbnailId: result.thumbnail?.id,
                    url: result.url,
                    source: result.source as ListingSource,
                })),
            ];
        }
        return listings;
    }

    private static async startBackgroundTasks() {
        if (
            Date.now() - DatabaseManager.lastBackgroundTaskTime >
            this.BACKGROUND_TASK_BETWEEN_MS
        ) {
            return;
        }
        setInterval(() => this.removeStaleSearches(), 1000);
    }

    private static async removeStaleSearches() {
        const searches = await prisma.search.findMany({
            where: {
                time: {
                    lt: new Date(Date.now() - this.STALE_SEARCH_MS),
                },
            },
        });

        if (searches.length === 0) {
            return;
        }

        console.log('Removing stale searches...');

        for (const search of searches) {
            await prisma.search.delete({ where: { id: search.id } });
        }
    }

    private static async bufferFromImageUrl(url: string): Promise<Buffer | null> {
        try {
            const response = await axiosInstance.get(url, {
                responseType: 'arraybuffer',
                timeout: 5000,
                'axios-retry': {
                    retries: 3,
                },
            });
            return Buffer.from(response.data);
        } catch (error) {
            if (error instanceof TypeError) {
                // The image URL is invalid
                return null;
            }
            console.error('Failed to fetch the buffer:', error);
            return null;
        }
    }
}
