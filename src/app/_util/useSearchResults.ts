import { useCallback, useRef, useState } from 'react';
import { Listing as ListingModel } from '@/types/listings';
import { getListings } from '@/app/_util/getListings';
import { GetListingsOptions, SearchOptionsState } from '@/types/requests';
import { GetListingsError } from '@/app/_util/GetListingsError';

export function useSearchResults() {
    const [searchResults, setSearchResults] = useState<ListingModel[]>([]);
    const searchResultsRef = useRef<ListingModel[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const dataGeneratorRef = useRef<AsyncGenerator<ListingModel[], void, unknown> | null>(
        null,
    );
    const executedSearchOptions = useRef<GetListingsOptions | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const processDataGenerator = useCallback(
        async (currentSearchOptions: GetListingsOptions) => {
            if (dataGeneratorRef.current) {
                try {
                    for await (const data of dataGeneratorRef.current) {
                        if (executedSearchOptions.current === currentSearchOptions) {
                            const newSearchResults =
                                searchResultsRef.current.concat(data);
                            setSearchResults(newSearchResults);
                            searchResultsRef.current = newSearchResults;
                        }
                    }
                    setSearchError(null);
                } catch (error) {
                    if (error instanceof GetListingsError) {
                        setSearchError(error.message);
                    } else {
                        setSearchError('Unknown critical error');
                    }
                    console.error(error);
                } finally {
                    setSearchLoading(false);
                }
            }
        },
        [],
    );

    const executeSearch = useCallback(
        async (searchTerm: string, extraOptions: SearchOptionsState) => {
            const options = { query: searchTerm, ...extraOptions };

            setSearchResults([]);
            searchResultsRef.current = [];
            setSearchLoading(true);
            executedSearchOptions.current = options;
            dataGeneratorRef.current = getListings(options);
            void processDataGenerator(options);
        },
        [processDataGenerator],
    );

    return { searchResults, searchLoading, executeSearch, searchError };
}
