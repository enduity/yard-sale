import * as cheerio from 'cheerio';
import { Listing, ListingDataWithDate, ListingSource } from '@/types/listings';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';
import { fetchWithCycleTLS } from '@/app/api/v1/listings/_util/fetchWithCycleTLS';
import { SearchCriteria } from '@/types/search';

export class OkidokiScraper {
    private async *scrape(query: string): AsyncGenerator<ListingDataWithDate> {
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // Construct the URL for the search
            const url = `https://www.okidoki.ee/buy/all/?query=${encodeURIComponent(
                query,
            )}&p=${currentPage}`;

            // Fetch the page content
            const response = await fetchWithCycleTLS(url, '');
            const html = String(response.body);

            // Load the HTML content using cheerio
            const $ = cheerio.load(html);

            // Parse the data you want from the page
            for (const element of $('.classifieds__item')) {
                const title = $(element)
                    .find('a.horiz-offer-card__title-link')
                    .text()
                    .trim();
                const priceText = $(element)
                    .find('.horiz-offer-card__price-value')
                    .text()
                    .replace(/[€$£]/, '')
                    .trim();
                const price = Number(priceText);
                const location = $(element)
                    .find('.horiz-offer-card__location')
                    .text()
                    .trim();
                const urlValue = $(element)
                    .find('a.horiz-offer-card__title-link')
                    .attr('href')
                    ?.trim();
                if (!urlValue) continue;
                const url = new URL(urlValue, 'https://www.okidoki.ee').href;
                const thumbnailNoscript = $(element)
                    .find('a.horiz-offer-card__image-link > noscript')
                    .html();
                const listedAtText = $(element)
                    .find('.horiz-offer-card__date')
                    .text()
                    .trim();
                let listedAt: Date;
                if (listedAtText.includes('Täna')) {
                    listedAt = new Date();
                } else {
                    const [day, month, year] = listedAtText.split('.').map(Number);
                    listedAt = new Date(year, month - 1, day);
                }
                if (!thumbnailNoscript) continue;
                const $thumbnail = cheerio.load(thumbnailNoscript);
                const thumnailValue = $thumbnail('img').attr('src');
                if (!thumnailValue) continue;
                const thumbnailSrc = new URL(thumnailValue, 'https://www.okidoki.ee')
                    .href;

                if (title && url && !isNaN(price) && location && thumbnailSrc) {
                    yield { title, price, location, url, thumbnailSrc, listedAt };
                }
            }

            // Check for the existence of a next page link
            const nextPage = $('a.pager__next').attr('href');
            hasNextPage = Boolean(nextPage);
            if (hasNextPage) currentPage++;
        }
    }

    public async *scrapeWithCache(
        query: string,
        searchCriteria?: SearchCriteria,
    ): AsyncGenerator<Listing> {
        for await (const listingData of this.scrape(query)) {
            if (
                searchCriteria?.maxDaysListed &&
                listingData.listedAt.getTime() <
                    Date.now() - searchCriteria.maxDaysListed * 24 * 60 * 60 * 1000
            ) {
                continue;
            }
            const listing = await DatabaseManager.addListing(
                listingData,
                query,
                ListingSource.Okidoki,
                searchCriteria,
            );
            yield listing;
        }
    }
}
