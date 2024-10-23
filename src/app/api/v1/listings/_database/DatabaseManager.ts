import { prisma } from '@/lib/prisma';
import { Listing, ListingData, ListingSource } from '@/types/listings';
import { Prisma } from '@prisma/client';
import { SearchCriteria } from '@/types/search';
import { fetchWithCycleTLS } from '@/lib/CycleTLS/fetchWithCycleTLS';
import { getCycleTLS } from '@/lib/CycleTLS/getCycleTLS';
import ProxyManager from '@/lib/ProxyManager';

export class DatabaseManager {
    private static readonly STALE_SEARCH_MS = 60 * 60 * 1000;
    private static readonly BACKGROUND_TASK_BETWEEN_MS = 60 * 1000;
    private static lastBackgroundTaskTime = Date.now() - 60 * 1000;

    static async addOrGetSearch(
        searchQuery: string,
        searchCriteria?: SearchCriteria,
    ): Promise<Prisma.SearchGetPayload<{ include: { searchCriteria: true } }>> {
        const existingSearch = await prisma.search.findFirst({
            where: { query: searchQuery, searchCriteria: searchCriteria },
            include: { searchCriteria: true },
        });

        if (!existingSearch) {
            const createdSearch = await prisma.search.create({
                data: { query: searchQuery },
            });
            const createdSearchCriteria = await prisma.searchCriteria.create({
                data: {
                    searchId: createdSearch.id,
                    ...searchCriteria,
                },
            });
            return { searchCriteria: createdSearchCriteria, ...createdSearch };
        }
        return existingSearch;
    }

    public static async addListing(
        listingData: ListingData,
        searchQuery: string,
        source: ListingSource,
        searchCriteria?: SearchCriteria,
    ): Promise<Listing> {
        const imageBuffer = await this.bufferFromImageUrl(
            listingData.thumbnailSrc,
            source === ListingSource.Marketplace,
        );

        // First, add the search term (if it doesn't exist)
        const search = await this.addOrGetSearch(searchQuery, searchCriteria);
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
        searchCriteria?: SearchCriteria,
        sourceFilter?: ListingSource,
    ): Promise<Listing[] | null> {
        const searches = await prisma.search.findMany({
            where: {
                query: searchQuery,
                searchCriteria: searchCriteria,
            },
            include: {
                results: {
                    include: { thumbnail: true },
                    where: sourceFilter ? { source: sourceFilter } : undefined,
                },
            },
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

    private static async bufferFromImageUrl(
        url: string,
        useCycleTLS?: boolean,
    ): Promise<Buffer | null> {
        try {
            // Even if useCycleTLS is true, we try fetching first as it is faster
            const maxRetries = useCycleTLS ? 1 : 3;
            let buffer: Buffer | null = null;
            let response;
            try {
                response = await ProxyManager.fetch(
                    url,
                    {
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                        },
                    },
                    {
                        blockProxyOnError: false,
                        maxAttempts: maxRetries,
                    },
                );
                const arrayBuffer = await response!.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } catch (error) {
                if (!useCycleTLS) {
                    console.error(
                        `Failed to fetch image buffer for ${url} with error: ${error}`,
                    );
                }
            }
            if (useCycleTLS) {
                const cycleTLS = await getCycleTLS();
                const response = await fetchWithCycleTLS(cycleTLS, url);
                if (!response || typeof response.body === 'object') {
                    console.error(`Failed to fetch image buffer for ${url}`);
                    return null;
                }
                buffer = Buffer.from(response.body, 'base64');
            }
            if (!buffer) {
                console.error(`Failed to fetch image buffer for ${url}`);
                return null;
            }
            return buffer;
        } catch (error) {
            if (error instanceof TypeError) {
                // The image URL is invalid
                return null;
            }
            console.error(`Error fetching image buffer for ${url}: ${error}`);
            return null;
        }
    }
}
