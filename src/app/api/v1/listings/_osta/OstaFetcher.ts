import { ListingDataWithDate, ListingSource } from '@/types/listings';
import { fetchWithCycleTLS } from '@/app/api/v1/listings/_common/fetchWithCycleTLS';
import { BaseScraper } from '@/app/api/v1/listings/_common/BaseScraper';
import { SearchCriteria } from '@/types/search';
import { CycleTLSClient } from 'cycletls';

type OstaJsonListing = {
    id: number;
    title: string;
    location: string;
    image_id: number | null;
    images: {
        id: number;
        orig: 1 | 0;
    }[];
    current_price: number;
    date_start: string;
} & (
    | {
          buynow_price: number;
          buynow_offer_price: number | null;
          buynow_allowed: true;
      }
    | {
          buynow_allowed: false;
          buynow_price: null;
          buynow_offer_price: null;
      }
);

export class OstaFetcher extends BaseScraper {
    constructor(query: string, searchCriteria?: SearchCriteria) {
        super(query, ListingSource.OstaEE, searchCriteria);
    }

    private craftQueryURL(page: number): string {
        // Osta.ee has a fixed page size of 60, 120, or 180
        const pageSize: 60 | 120 | 180 = 60;
        const url = new URL('https://api.osta.ee/api/search/');
        const queryParams: {
            [key: string]: string;
        } = {
            // The search query is 'q[q]' for some reason
            'q[q]': this.query,
            // Page size is documented as 'limit', but it is actually 'pagesize'
            pagesize: String(pageSize),
            // Page number is documented as 'page', but we actually need to use 'start'
            start: String((page - 1) * pageSize),
        };
        url.search = Object.keys(queryParams)
            .map((key) => {
                const encodedKey = encodeURIComponent(key);
                const encodedValue = encodeURIComponent(queryParams[key]).replace(
                    /%20/g,
                    '+',
                );
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
        const foundListingIds = new Set<number>();

        while (hasNextPage) {
            const url = this.craftQueryURL(currentPage);
            const response = await fetchWithCycleTLS(cycleTLS, url, '');
            if (!response.body || typeof response.body !== 'object') {
                throw new Error('Invalid response body');
            }
            const data = response.body;
            const items: OstaJsonListing[] = data[0]?.items;
            const total = data[0]?.total;

            for (const item of items) {
                if (foundListingIds.has(item.id)) {
                    continue;
                }
                foundListingIds.add(item.id);
                if (!item.buynow_allowed) {
                    continue;
                }
                let price = item.buynow_price;
                if (item.buynow_offer_price && item.buynow_offer_price < price) {
                    price = item.buynow_offer_price;
                }
                const imageId =
                    item.image_id?.toString() ?? item.images?.[0]?.id.toString() ?? null;
                let thumbnailSrc =
                    'https://www.osta.ee/assets/gfx/images/default_large.jpg';
                if (imageId) {
                    const imageUrlSlice = imageId.slice(imageId.length - 4);
                    thumbnailSrc = `https://osta.img-bcg.eu/item/11/${imageUrlSlice}/${imageId}.jpg`;
                }
                const listingData: ListingDataWithDate = {
                    price,
                    title: item.title,
                    location: item.location || '',
                    thumbnailSrc,
                    url: `https://osta.ee/${item.id}`,
                    listedAt: new Date(item.date_start),
                };
                yield listingData;
            }

            if (foundListingIds.size >= total) {
                hasNextPage = false;
            } else {
                currentPage++;
            }
        }
    }
}
