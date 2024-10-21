import { ElementHandle, HTTPRequest, Page } from 'puppeteer';
import { ListingData } from '@/types/listings';
import { CatalogLoadJsonContent } from '@/types/marketplaceJson';

export class ScrollManager {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public async *scrollAndCollectListings(
        processListings: (jsonString: string) => Promise<ListingData[]>,
        checkSeeMorePopup: () => Promise<boolean>,
        waitForNewContent: () => Promise<HTTPRequest | null>,
    ): AsyncGenerator<ListingData> {
        const mainScrollableContainer = await this.findMainScrollableContainer();

        if (!mainScrollableContainer) {
            // There is nothing to scroll to
            return;
        }

        if (!(await checkSeeMorePopup())) {
            throw new Error('Fatal: failed to close "See more" popup');
        }

        // Perform a single scroll and collect new content
        void (await this.page.evaluate((container) => {
            container.scrollTop = Math.min(
                container.scrollHeight,
                container.scrollTop + window.innerHeight * 2,
            );
            return container.scrollTop;
        }, mainScrollableContainer));

        const newContentRequest = await waitForNewContent();
        const newContentBody = await newContentRequest?.response()?.text();

        if (!newContentRequest || !newContentBody) {
            console.warn('No new content found');
            return;
        }

        if (!(await checkSeeMorePopup())) {
            throw new Error('Fatal: failed to close "See more" popup');
        }

        for (const listing of await processListings(newContentBody)) {
            yield listing;
        }

        // Repeat the request using end_cursor for pagination
        let pageInfo = this.pageInfo(newContentBody);
        let prevCursor = '';
        let counter = 0;
        while (pageInfo.hasNextPage) {
            if (counter > 50) {
                throw new Error('Too many repeated requests');
            } else if (counter > 10) {
                // Increased delay
                console.warn(
                    'Increased delay active, repeated request counter:',
                    counter,
                    'page:',
                    pageInfo.endCursor.match(/{"pg":\d+/)?.[0],
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, 1500 + Math.random() * 200),
                );
            } else if (counter > 5) {
                // Increased delay
                console.warn(
                    'Increased delay active, repeated request counter:',
                    counter,
                    'cursor:',
                    pageInfo.endCursor.match(/{"pg":\d+/)?.[0],
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, 1200 + Math.random() * 200),
                );
            } else {
                console.log(
                    'Requesting more listings, cursor:',
                    pageInfo.endCursor.slice(0, 20),
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, 800 + Math.random() * 200),
                );
            }
            if (prevCursor === pageInfo.endCursor) {
                throw new Error('Cursor did not change');
            }
            const repeatedContentBody = await this.repeatRequest(
                newContentRequest,
                pageInfo.endCursor,
            );
            counter++;
            if (!repeatedContentBody) {
                break;
            }
            for (const listing of await processListings(repeatedContentBody)) {
                yield listing;
            }
            prevCursor = pageInfo.endCursor;
            pageInfo = this.pageInfo(repeatedContentBody);
        }
    }

    private async findMainScrollableContainer(): Promise<ElementHandle | null> {
        const minWidthPercent = 30;
        const minWidth =
            (await this.page.evaluate(() => window.innerWidth)) * (minWidthPercent / 100);
        const scrollableElement: ElementHandle | Element | null | string =
            (await this.page.$$eval(
                '*',
                (elements, minWidth): Element | null | string => {
                    const result = elements.find((element) => {
                        const style = window.getComputedStyle(element);
                        const overflowY = style.getPropertyValue('overflow-y');
                        const elementWidth = element.getBoundingClientRect().width;

                        const isScrollable =
                            overflowY === 'auto' || overflowY === 'scroll';
                        const hasMinWidth = elementWidth >= minWidth;
                        const isOverflowing = element.scrollHeight > element.clientHeight;
                        return isScrollable && hasMinWidth && isOverflowing;
                    });
                    if (result === undefined) {
                        return null;
                    }
                    if (result.tagName === 'HTML') {
                        return 'html';
                    }
                    return result;
                },
                minWidth,
            )) as ElementHandle | Element | null | string;
        if (scrollableElement === 'html') {
            return this.page.$('html');
        }
        if (scrollableElement instanceof ElementHandle) {
            return scrollableElement;
        }
        return null;
    }

    private pageInfo(response: string): {
        hasNextPage: boolean;
        endCursor: string;
    } {
        const jsonContent: CatalogLoadJsonContent = JSON.parse(
            response,
        ) as CatalogLoadJsonContent;
        const hasNextPage =
            jsonContent.data.marketplace_search.feed_units.page_info.has_next_page;
        const endCursor =
            jsonContent.data.marketplace_search.feed_units.page_info.end_cursor;
        return { hasNextPage, endCursor };
    }

    private async repeatRequest(
        request: HTTPRequest,
        endCursor: string,
    ): Promise<string | null> {
        const requestData = request.postData();
        if (!requestData) {
            return null;
        }

        const formData = new URLSearchParams(requestData);
        const variables = JSON.parse(formData.get('variables') || '{}');
        variables.cursor = endCursor; // Use the end_cursor from the previous response
        formData.set('variables', JSON.stringify(variables));

        return await this.page.evaluate(
            async (url, headers, body) => {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: JSON.parse(headers),
                    body,
                });
                return response.text();
            },
            request.url(),
            JSON.stringify(request.headers()),
            formData.toString(),
        );
    }
}
