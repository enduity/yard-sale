import * as cheerio from 'cheerio';
import { ListingDataWithDate, ListingSource } from '@/types/listings';
import { fetchWithCycleTLS } from '@/lib/CycleTLS/fetchWithCycleTLS';
import { BaseScraper } from '@/app/api/v1/listings/_common/BaseScraper';
import { Condition, SearchCriteria } from '@/types/search';
import { CycleTLSClient } from '@/lib/CycleTLS/client';

type ConditionValue = 'new' | 'used' | 'old' | 'antique';

const PAGE_SIZE = 120;
const MAX_PAGES = 9;

export class OstaFetcher extends BaseScraper {
    constructor(query: string, searchCriteria?: SearchCriteria) {
        super(query, ListingSource.OstaEE, searchCriteria);
    }

    private craftQueryURL(start: number): string {
        const url = new URL('https://www.osta.ee');
        url.searchParams.set('fuseaction', 'search.search');
        url.searchParams.set('q[q]', this.query);

        const condition = this.searchCriteria?.condition;
        if (condition === Condition.New) {
            url.searchParams.append('q[condition][]', 'new');
        } else if (condition === Condition.Used) {
            for (const conditionValue of ['old', 'antique', 'used'] as ConditionValue[]) {
                url.searchParams.append('q[condition][]', conditionValue);
            }
        }

        url.searchParams.set('start', String(start));
        return url.toString();
    }

    protected async *scrapeProcess(
        cycleTLS: CycleTLSClient,
    ): AsyncGenerator<ListingDataWithDate> {
        const foundListingIds = new Set<string>();

        for (
            let start = 0, page = 1;
            page <= MAX_PAGES;
            start += PAGE_SIZE, page++
        ) {
            const response = await fetchWithCycleTLS(
                cycleTLS,
                this.craftQueryURL(start),
            );
            const html = await response?.text();
            if (!html) {
                break;
            }
            const $ = cheerio.load(html);

            let newItems = 0;
            for (const element of $('figure.offer-thumb')) {
                const figure = $(element);
                const href = figure
                    .find('a.js-item-link')
                    .first()
                    .attr('href')
                    ?.trim();
                if (!href) continue;
                const listingUrl = new URL(href, 'https://www.osta.ee').href;

                // Search results repeat listings (grouped by seller), so
                // dedupe by listing URL
                if (foundListingIds.has(listingUrl)) continue;
                foundListingIds.add(listingUrl);

                const price = Number(figure.attr('data-price'));
                const title =
                    figure.attr('data-bs-title')?.trim() ??
                    figure.find('.js-item-link').last().text().trim();
                const thumbnailValue = figure
                    .find('img')
                    .first()
                    .attr('src');
                if (!thumbnailValue) continue;

                if (title && listingUrl && !isNaN(price) && thumbnailValue) {
                    newItems++;
                    // osta.ee exposes no listing dates in the search results;
                    // treat as listed today.
                    yield {
                        title,
                        price,
                        location: '',
                        thumbnailSrc: thumbnailValue,
                        url: listingUrl,
                        listedAt: new Date(),
                    };
                }
            }

            if (newItems === 0) {
                break;
            }

            // Courtesy delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}
