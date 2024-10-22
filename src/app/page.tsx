'use client';

import { useState } from 'react';
import { useSearchResults } from '@/app/_util/useSearchResults';
import { SearchBar } from '@/app/_components/SearchBar/SearchBar';
import { SearchResults } from '@/app/_components/SearchResults';
import { SearchOptionsState } from '@/types/requests';

export default function Home() {
    const [hasSearched, setHasSearched] = useState(false);
    const { searchResults, searchLoading, executeSearch, searchError } =
        useSearchResults();

    const handleSearch = async (
        searchTerm: string,
        searchOptions: SearchOptionsState,
    ) => {
        setHasSearched(true);
        void executeSearch(searchTerm, searchOptions);
    };

    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-8">
            <h1 className="mb-6 text-4xl font-bold text-gray-800">Yard Sale</h1>
            <p className="mb-4 text-lg text-gray-600">
                Find the best deals on used items across different platforms.
            </p>
            <SearchBar handleSearch={handleSearch} />
            <div className="w-full max-w-4xl">
                {hasSearched && (
                    <SearchResults
                        searchResults={searchResults}
                        searchLoading={searchLoading}
                        searchError={searchError ?? undefined}
                    />
                )}
            </div>
        </div>
    );
}
