import { NextRequest, NextResponse } from 'next/server';
import { FacebookMarketplaceScraper } from './_lib/FacebookMarketplaceScraper';
import { fetchFirstListings, Location } from './_lib/fetchFirstListings';
import { ListingData, Listing, ListingSource } from '@/types';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import ScrapeManager from '@/app/api/marketplace/_lib/ScrapeManager';
import { axiosInstance } from '@/lib/axiosInstance';
import { axiosRetry } from '@/lib/axiosRetry';
import axios from 'axios';

async function addSearchToDb(searchTerm: string) {
    const existingSearch = await prisma.search.findFirst({
        where: { query: searchTerm },
    });

    if (!existingSearch) {
        return prisma.search.create({ data: { query: searchTerm } });
    }
    return existingSearch;
}

async function bufferFromUrl(url: string): Promise<Buffer | null> {
    const axiosInstanceWithRetry = axios.create(axiosInstance.defaults);
    axiosRetry(axiosInstanceWithRetry);
    try {
        const response = await axiosInstanceWithRetry.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Failed to fetch the buffer:', error);
        return null;
    }
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
            price: new Prisma.Decimal(listingData.price),
            title: listingData.title,
            location: listingData.location,
            url: listingData.url,
            searchId: search.id,
            source: ListingSource.Marketplace,
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
    return prisma.listing.findFirstOrThrow({
        where: { id: listing.id },
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
        { status: 500 },
    );

    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('searchTerm');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '8', 10);

    if (!searchTerm) {
        return NextResponse.json({ error: 'searchTerm is required' }, { status: 400 });
    }

    const scrapeManager = ScrapeManager.getInstance();

    // Retrieve from cache first
    let cachedListings = await getFromCache(searchTerm);
    const scrapingWhenRequested = scrapeManager.alreadyScraping(searchTerm);

    if (cachedListings.length && !scrapingWhenRequested) {
        const paginatedListings = cachedListings.slice(
            (page - 1) * pageSize,
            page * pageSize,
        );
        if (!paginatedListings.length) {
            return NextResponse.json({ error: 'No listings found' }, { status: 404 });
        }
        const hasMore = cachedListings.length > page * pageSize;
        return NextResponse.json({
            message: 'Cached search results',
            listings: paginatedListings,
            hasMore,
        });
    }

    if (scrapingWhenRequested && cachedListings.length >= page * pageSize) {
        const paginatedListings = cachedListings.slice(
            (page - 1) * pageSize,
            page * pageSize,
        );
        return NextResponse.json({
            message: 'Cached search results',
            listings: paginatedListings,
            hasMore: true,
        });
    } else if (scrapingWhenRequested) {
        return NextResponse.json(
            {
                message: 'This page is currently processing, please try again later.',
            },
            {
                status: 503,
                headers: {
                    'Retry-After': '0.4',
                },
            },
        );
    }

    // Fetch first listings using fetchFirstListings
    const options = {
        query: searchTerm,
        location: Location.Tallinn,
    };

    let firstListings: ListingData[];

    try {
        firstListings = await fetchFirstListings(options);
    } catch (error) {
        console.error('Error fetching first listings:', error);
        return accessErrorResponse;
    }

    if (!firstListings.length) {
        return NextResponse.json({ error: 'No listings found' }, { status: 404 });
    }

    // Cache the first listings
    for (const listingData of firstListings) {
        await addToCache(listingData, searchTerm);
    }

    // Get updated cached listings
    cachedListings = await getFromCache(searchTerm);

    // Start the scraper in the background
    const scrape = scrapeManager.startScrape(searchTerm);

    void (async () => {
        const scraper = new FacebookMarketplaceScraper();
        try {
            await scraper.init();
            const listingGenerator = scraper.scrape(searchTerm);
            for await (const listingData of listingGenerator) {
                // Deduplicate listings
                const exists = await prisma.listing.findFirst({
                    where: { url: listingData.url },
                });
                if (!exists) {
                    await addToCache(listingData, searchTerm);
                }
            }
        } catch (error) {
            console.error('Error during scraping:', error);
        } finally {
            scrape.end();
            await scraper.close();
        }
    })();

    // Paginate the collected data
    const paginatedListings = cachedListings.slice(
        (page - 1) * pageSize,
        page * pageSize,
    );
    const hasMore =
        cachedListings.length > page * pageSize ||
        scrapeManager.alreadyScraping(searchTerm);

    return NextResponse.json({
        message: 'Fetched initial listings',
        listings: paginatedListings,
        hasMore,
    });
}
