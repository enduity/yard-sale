'use client';

import { useState } from 'react';
import { usePreviousSearches } from '@/app/_util/usePreviousSearches';
import { useSearchResults } from '@/app/_util/useSearchResults';
import { SearchBar } from '@/app/_components/SearchBar/SearchBar';
import { SearchResults } from '@/app/_components/SearchResults';
import { SearchOptionsState } from '@/types/requests';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOptions, setSearchOptions] = useState<SearchOptionsState>({});
    const [hasSearched, setHasSearched] = useState(false);
    const [showHistoryCleared, setShowHistoryCleared] = useState(false);

    const { previousSearches, updatePreviousSearches, clearSearchHistory } =
        usePreviousSearches();

    const { searchResults, searchLoading, executeSearch } = useSearchResults();

    const handleSearch = async () => {
        setHasSearched(true);
        updatePreviousSearches(searchTerm);
        void executeSearch(searchTerm, searchOptions);
    };

    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-8">
            <h1 className="mb-6 text-4xl font-bold text-gray-800">Yard Sale</h1>
            <p className="mb-4 text-lg text-gray-600">
                Find the best deals on used items across different platforms.
            </p>
            <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchOptions={searchOptions}
                setSearchOptions={setSearchOptions}
                handleSearch={handleSearch}
                previousSearches={previousSearches}
                clearSearchHistory={() => {
                    clearSearchHistory();
                    setShowHistoryCleared(true);
                }}
                showHistoryCleared={showHistoryCleared}
                setShowHistoryCleared={setShowHistoryCleared}
            />
            <SearchResults
                hasSearched={hasSearched}
                searchResults={searchResults}
                searchLoading={searchLoading}
            />
        </div>
    );
}
