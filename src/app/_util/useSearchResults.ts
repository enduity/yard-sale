import { useCallback, useRef, useState } from 'react';
import { Listing as ListingModel } from '@/types/listings';
import { getListings } from '@/app/_util/getListings';

export function useSearchResults() {
    const [searchResults, setSearchResults] = useState<ListingModel[]>([]);
    const searchResultsRef = useRef<ListingModel[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const dataGeneratorRef = useRef<AsyncGenerator<ListingModel[], void, unknown> | null>(
        null,
    );
    const executedSearchTerm = useRef('');

    const processDataGenerator = useCallback(async (currentSearchTerm: string) => {
        if (dataGeneratorRef.current) {
            try {
                for await (const data of dataGeneratorRef.current) {
                    console.log('Data:', data);
                    if (executedSearchTerm.current === currentSearchTerm) {
                        console.log('Fetched data:', data);
                        const newSearchResults = searchResultsRef.current.concat(data);
                        setSearchResults(newSearchResults);
                        searchResultsRef.current = newSearchResults;
                    }
                }
                console.log('No more data to fetch');
                setSearchLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setSearchLoading(false);
            }
        }
    }, []);

    const executeSearch = useCallback(
        async (searchTerm: string) => {
            setSearchResults([]);
            searchResultsRef.current = [];
            setSearchLoading(true);
            executedSearchTerm.current = searchTerm;
            dataGeneratorRef.current = getListings(searchTerm);
            void processDataGenerator(searchTerm);
        },
        [processDataGenerator],
    );

    return { searchResults, searchLoading, executeSearch };
}
