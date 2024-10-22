import * as cheerio from 'cheerio';
import { CycleTLSClient } from 'cycletls';
import { BaseScraper } from '@/app/api/v1/listings/_common/BaseScraper';
import { fetchWithCycleTLS } from '@/app/api/v1/listings/_common/fetchWithCycleTLS';
import { ListingDataWithDate, ListingSource } from '@/types/listings';
import { Condition, SearchCriteria } from '@/types/search';

export class OkidokiScraper extends BaseScraper {
    constructor(query: string, searchCriteria?: SearchCriteria) {
        super(query, ListingSource.Okidoki, searchCriteria);
    }

    private craftQueryURL(page: number): string {
        const url = new URL('https://www.okidoki.ee/buy/all/');
        const queryParams: {
            [key: string]: string;
        } = {
            query: this.query,
            p: String(page),
        };

        const condition = this.searchCriteria?.condition;
        if (condition === Condition.New) {
            queryParams.cond = '1';
        } else if (condition === Condition.Used) {
            queryParams.cond = '2';
        }

        url.search = Object.keys(queryParams)
            .map((key) => {
                const encodedKey = encodeURIComponent(key);
                const encodedValue = encodeURIComponent(queryParams[key]);
                return `${encodedKey}=${encodedValue}`;
            })
            .join('&');
        return url.toString();
    }

    protected async *scrapeProcess(
        cycleTLS: CycleTLSClient,
    ): AsyncGenerator<ListingDataWithDate> {
        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const url = this.craftQueryURL(currentPage);
            const response = await fetchWithCycleTLS(cycleTLS, url, '');
            const html = String(response.body);
            const $ = cheerio.load(html);

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
                const thumbnailValue = $thumbnail('img').attr('src');
                if (!thumbnailValue) continue;
                const thumbnailSrc = new URL(thumbnailValue, 'https://www.okidoki.ee')
                    .href;

                if (title && url && !isNaN(price) && location && thumbnailSrc) {
                    yield { title, price, location, url, thumbnailSrc, listedAt };
                }
            }

            const nextPage = $('a.pager__next').attr('href');
            hasNextPage = Boolean(nextPage);
            if (hasNextPage) currentPage++;
        }
    }
}
