import { Listing as ListingModel } from '@/types';

export async function* getListings(searchTerm: string): AsyncGenerator<ListingModel[]> {
    enum SearchStatus {
        Success = 'success',
        Wait = 'wait',
        Fail = 'fail',
    }

    type SearchResponse =
        | {
              listings: ListingModel[];
              hasMore: boolean;
              message: string;
              status: SearchStatus.Success;
          }
        | {
              status: SearchStatus.Wait;
              waitTime: number;
          }
        | {
              status: SearchStatus.Fail;
              message: string;
          };

    const doRequest = async (page: number | null = null): Promise<SearchResponse> => {
        let requestResponse: Response;
        try {
            requestResponse = await fetch(
                `/api/marketplace?searchTerm=${encodeURIComponent(searchTerm)}${page ? `&page=${page}` : ''}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : (error as string);
            return { status: SearchStatus.Fail, message: errorMessage };
        }
        if (requestResponse.status === 503) {
            const waitTime =
                parseFloat(requestResponse.headers.get('Retry-After') ?? '0.4') * 1000;
            return {
                status: SearchStatus.Wait,
                waitTime: waitTime,
            };
        }
        if (!requestResponse.ok) {
            return {
                status: SearchStatus.Fail,
                message: `Request failed, status ${requestResponse.status}, content ${requestResponse.body}`,
            };
        }
        const requestData = await requestResponse.json();
        return {
            status: SearchStatus.Success,
            ...requestData,
        };
    };

    const firstData = await doRequest();

    if (firstData.status !== SearchStatus.Success) {
        const errorMessage =
            firstData.status === SearchStatus.Fail
                ? firstData.message
                : 'API sent 503 too early';
        throw new Error(`Request failed: ${errorMessage}`);
    }
    console.log('Yielding first data');
    yield firstData.listings;
    let hasMore = firstData['hasMore'];
    let page = 2;
    while (hasMore) {
        console.log('Requesting more..');
        const data = await doRequest(page);
        console.log('Request complete');
        if (data.status === SearchStatus.Wait) {
            console.log('Waiting...');
            await new Promise((resolve) => setTimeout(resolve, data.waitTime));
            continue;
        }
        if (data.status === SearchStatus.Fail) {
            console.error('Failed request');
            throw new Error(`Request failed: ${data.message}`);
        }
        console.log('Yielding more');
        yield data.listings;
        hasMore = data.hasMore;
        page += 1;
    }
}
