import { NextRequest, NextResponse } from 'next/server';
import { FacebookMarketplaceScraper } from './_lib/FacebookMarketplaceScraper';

export async function POST(req: NextRequest) {
    const accessErrorResponse = NextResponse.json(
        { error: 'Unable to access Facebook Marketplace. Try again later.' },
        { status: 500 }
    );

    const { searchTerm } = await req.json();

    const scraper = new FacebookMarketplaceScraper();
    try {
        await scraper.init();
        const listingData = await scraper.scrape(searchTerm);
        await scraper.close();
        return NextResponse.json({ message: 'Search completed', listings: listingData });
    } catch (error) {
        console.error('Error during scraping:', error);
        await scraper.close();
        return accessErrorResponse;
    }
}

export function GET() {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
