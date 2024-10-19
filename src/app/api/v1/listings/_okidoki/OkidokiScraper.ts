import * as cheerio from 'cheerio';
import { Listing, ListingData, ListingSource } from '@/types/listings';
import initCycleTLS from 'cycletls';
import { DatabaseManager } from '@/app/api/v1/listings/_database/DatabaseManager';

type OkidokiListingData = ListingData & { listedAt: Date };

export class OkidokiScraper {
    private async fetchWithCycleTLS(url: string, body: string) {
        const cycleTLS = await initCycleTLS();
        const result = await cycleTLS(
            url,
            {
                body: body,
                ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,10-51-0-11-35-5-16-27-65281-45-23-43-17513-18-65037-13,25497-29-23-24,0',
                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            },
            'get',
        );
        void cycleTLS.exit();
        return result;
    }

    private async *scrape(query: string): AsyncGenerator<OkidokiListingData> {
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // Construct the URL for the search
            const url = `https://www.okidoki.ee/buy/all/?query=${encodeURIComponent(
                query,
            )}&p=${currentPage}`;

            // Fetch the page content
            const response = await this.fetchWithCycleTLS(url, '');
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
        maxDaysListed?: number,
    ): AsyncGenerator<Listing> {
        for await (const listingData of this.scrape(query)) {
            if (
                maxDaysListed &&
                listingData.listedAt.getTime() <
                    Date.now() - maxDaysListed * 24 * 60 * 60 * 1000
            ) {
                continue;
            }
            const listing = await DatabaseManager.addListing(
                listingData,
                query,
                ListingSource.Okidoki,
                maxDaysListed,
            );
            yield listing;
        }
    }
}
