import { Listing as ListingModel } from '@/types';
import { axiosInstance } from '@/lib/axiosInstance';
import axios from 'axios';

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
        try {
            const response = await axiosInstance.get(`/marketplace`, {
                params: {
                    searchTerm: searchTerm,
                    ...(page !== null && { page: page }),
                },
                timeout: 20000,
            });

            return {
                status: SearchStatus.Success,
                ...response.data,
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 503) {
                    const waitTime =
                        parseFloat(error.response.headers['retry-after'] ?? '0.4') * 1000;
                    return {
                        status: SearchStatus.Wait,
                        waitTime: waitTime,
                    };
                }
                if (error.response?.status === 404) {
                    return {
                        status: SearchStatus.Success,
                        listings: [],
                        hasMore: false,
                        message: '',
                    };
                }

                const errorMessage = error.response?.data?.message || error.message;
                return { status: SearchStatus.Fail, message: errorMessage };
            }

            let errorMessage: string;
            if (error instanceof Error) {
                errorMessage = error.message;
            } else {
                errorMessage = 'Unknown error';
            }
            return { status: SearchStatus.Fail, message: errorMessage };
        }
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
