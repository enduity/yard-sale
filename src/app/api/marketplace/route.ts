import { NextRequest, NextResponse } from 'next/server';
import { FacebookMarketplaceScraper } from './_lib/FacebookMarketplaceScraper';
import { ListingData, Listing, ListingSource } from '@/types';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

async function addSearchToDb(searchTerm: string) {
    const existingSearch = await prisma.search.findFirst({
        where: { query: searchTerm },
    });

    if (!existingSearch) {
        return prisma.search.create({ data: { query: searchTerm } });
    }
    return existingSearch;
}

async function bufferFromUrl(url: string) {
    const image = await (await fetch(url)).arrayBuffer();
    return Buffer.from(image);
}

async function addToCache(listingData: ListingData, searchTerm: string) {
    const imageBuffer = await bufferFromUrl(listingData.thumbnailSrc);

    // First, add the search term (if it doesn't exist)
    const search = await addSearchToDb(searchTerm);
    // Check if the listing already exists
    const existingListing = await prisma.listing.findFirst({
        where: { url: listingData.url },
        include: { thumbnail: true },
    });
    if (existingListing) {
        return existingListing;
    }
    // Add the listing
    const listing = await prisma.listing.create({
        data: {
            price: listingData.price,
            title: listingData.title,
            location: listingData.location,
            url: listingData.url,
            searchId: search.id,
            source: ListingSource.Marketplace,
        },
    });
    await prisma.thumbnail.create({
        data: {
            image: imageBuffer,
            Listing: { connect: { id: listing.id } },
        },
    });
    return prisma.listing.findFirstOrThrow({
        where: { url: listingData.url },
        include: { thumbnail: true },
    });
}

async function getFromCache(searchTerm: string): Promise<Listing[]> {
    const search = await prisma.search.findFirst({
        where: { query: searchTerm },
        include: { results: { include: { thumbnail: true } } },
    });

    if (search && Date.now() - search.time.getTime() > 3600000) {
        await prisma.search.delete({ where: { id: search.id } });
        return [];
    }

    if (!search) {
        return [];
    }

    return search.results.map((result) => ({
        price: result.price,
        title: result.title,
        location: result.location,
        thumbnailId: result.thumbnail?.id,
        url: result.url,
        source: result.source as ListingSource,
    }));
}

export async function GET(req: NextRequest) {
    const accessErrorResponse = NextResponse.json(
        { error: 'Unable to access Facebook Marketplace. Try again later.' },
        { status: 500 }
    );

    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('searchTerm');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '8', 10);

    if (!searchTerm) {
        return NextResponse.json({ error: 'searchTerm is required' }, { status: 400 });
    }

    const scraper = new FacebookMarketplaceScraper();
    try {
        await scraper.init();

        // Retrieve from cache first
        const cachedListings = await getFromCache(searchTerm);

        // If we have enough cached data, paginate it and return
        if (cachedListings.length && cachedListings.length >= (page - 1) * pageSize) {
            const paginatedListings = cachedListings.slice(
                (page - 1) * pageSize,
                page * pageSize
            );
            const hasMore = cachedListings.length > page * pageSize;
            return NextResponse.json({
                message: 'Cached search results',
                listings: paginatedListings,
                hasMore,
            });
        }

        // Fall back to scraping if cache is insufficient
        const listingGenerator = scraper.scrape(searchTerm);
        const listings: Listing[] = [...cachedListings];
        let generatorError: unknown = null;
        let generatorDone = false;

        void (async () => {
            try {
                for await (const listingData of listingGenerator) {
                    const cacheEntry = await addToCache(listingData, searchTerm);
                    listings.push({
                        price: new Prisma.Decimal(listingData.price),
                        title: listingData.title,
                        location: listingData.location,
                        thumbnailId: cacheEntry.thumbnail?.id,
                        url: listingData.url,
                        source: ListingSource.Marketplace,
                    });
                }
            } catch (error) {
                generatorError = error;
            } finally {
                generatorDone = true;
                await scraper.close();
            }
        })();

        // Wait until we have enough data or an error occurs
        while (listings.length < page * pageSize && !generatorError && !generatorDone) {
            await new Promise((res) => setTimeout(res, 100));
        }

        if (generatorError) {
            console.error('Error during scraping:', generatorError);
            await scraper.close();
            return accessErrorResponse;
        }

        // Paginate the collected data
        const paginatedListings = listings.slice((page - 1) * pageSize, page * pageSize);
        const hasMore = listings.length > page * pageSize;

        return NextResponse.json({
            message: 'Search completed',
            listings: paginatedListings,
            hasMore,
        });
    } catch (error) {
        console.error('Error during scraping:', error);
        await scraper.close();
        return accessErrorResponse;
    }
}
