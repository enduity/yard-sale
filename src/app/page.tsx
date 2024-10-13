'use client';

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Listing as ListingModel } from '@/types/listings';
import { clsx } from 'clsx';
import { getSuggestions } from '@/app/_util/getSuggestions';
import { Listing } from '@/app/_components/Listing';
import { SearchSuggestion } from '@/app/_components/SearchSuggestion';
import { getListings } from '@/app/_util/getListings';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const executedSearchTerm = useRef('');
    const [searchResults, setSearchResults] = useState<ListingModel[]>([]);
    const searchResultsRef = useRef<ListingModel[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [previousSearches, setPreviousSearches] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [showHistoryCleared, setShowHistoryCleared] = useState(false);
    const dataGeneratorRef = useRef<AsyncGenerator<ListingModel[], void, unknown> | null>(
        null,
    );

    useEffect(() => {
        const storedSearches = localStorage.getItem('previousSearches');
        if (storedSearches) {
            setPreviousSearches(JSON.parse(storedSearches));
        }
    }, []);

    const processDataGenerator = useCallback(async (currentSearchTerm: string) => {
        if (dataGeneratorRef.current) {
            try {
                for await (const data of dataGeneratorRef.current) {
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

    const handleSearch = useCallback(async () => {
        console.log('Handling search...');
        setSearchResults([]);
        searchResultsRef.current = [];
        setHasSearched(true);
        setSearchLoading(true);
        executedSearchTerm.current = searchTerm;
        dataGeneratorRef.current = getListings(searchTerm);

        const updatedSearches = [
            searchTerm,
            ...previousSearches.filter((term) => term !== searchTerm),
        ].slice(0, 10);
        setPreviousSearches(updatedSearches);

        localStorage.setItem('previousSearches', JSON.stringify(updatedSearches));

        void processDataGenerator(searchTerm);
    }, [searchTerm, previousSearches, processDataGenerator]);

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            if (highlightedIndex >= 0 && highlightedIndex < searchSuggestions.length) {
                handleDropdownSelect(searchSuggestions[highlightedIndex]);
            } else {
                void handleSearch();
            }
            setShowDropdown(false);
            return;
        }
        if (event.key === 'ArrowDown') {
            setHighlightedIndex((prevIndex) =>
                Math.min(prevIndex + 1, searchSuggestions.length - 1),
            );
        } else if (event.key === 'ArrowUp') {
            setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        } else if (event.key === 'Tab' && showDropdown) {
            setHighlightedIndex(
                (prevIndex) => (prevIndex + 1) % searchSuggestions.length,
            );
        } else {
            // Do not prevent default action if not one of the above keys
            return;
        }
        event.preventDefault();
    };

    const handleDropdownSelect = (term: string) => {
        setSearchTerm(term);
        setShowDropdown(false);
        setHighlightedIndex(-1);
    };

    const clearSearchHistory = () => {
        setPreviousSearches([]);
        localStorage.removeItem('previousSearches');
        setShowHistoryCleared(true);
    };

    const searchSuggestions = getSuggestions(previousSearches, searchTerm, 5);

    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-8">
            <h1 className="mb-6 text-4xl font-bold text-gray-800">Yard Sale</h1>
            <p className="mb-4 text-lg text-gray-600">
                Find the best deals on used items across different platforms.
            </p>
            <div className="relative z-10 mb-6 w-full max-w-xl">
                <div className="relative mb-4 h-14 w-full">
                    <div
                        className="absolute left-0 top-0 w-full overflow-clip rounded-lg
                            bg-white focus-within:ring-2 focus-within:ring-indigo-500"
                    >
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search for used items..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                    setHighlightedIndex(-1);
                                }}
                                onKeyDown={handleKeyDown}
                                onBlur={() => setShowDropdown(false)}
                                className={clsx(
                                    `w-full rounded-lg border border-gray-300 p-4
                                    shadow-sm focus:border-0 focus:outline-none`,
                                    showDropdown &&
                                        searchSuggestions.length > 0 &&
                                        'rounded-b-none border-0 border-b',
                                )}
                            />
                            <div
                                className={clsx(
                                    `pointer-events-none absolute left-0 top-0 flex h-full
                                    w-full items-center justify-center rounded-lg border-2
                                    border-emerald-800 bg-green-200 text-center
                                    font-semibold transition-opacity duration-150`,
                                    showHistoryCleared && 'opacity-100 duration-150',
                                    !showHistoryCleared &&
                                        'opacity-0 delay-[2s] duration-1000',
                                )}
                                onTransitionEnd={() =>
                                    showHistoryCleared && setShowHistoryCleared(false)
                                }
                            >
                                Search history cleared!
                            </div>
                        </div>
                        {showDropdown && searchSuggestions.length > 0 && (
                            <>
                                <div className="divide-y border-b">
                                    {searchSuggestions.map((term, index) => (
                                        <SearchSuggestion
                                            key={term}
                                            text={term}
                                            onSelect={handleDropdownSelect}
                                            isHighlighted={index === highlightedIndex}
                                            searchText={searchTerm}
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2 p-2">
                                    <button
                                        onClick={handleSearch}
                                        onMouseDown={handleSearch}
                                        className="rounded-md bg-indigo-600 py-3
                                            font-semibold text-white hover:bg-indigo-700"
                                    >
                                        Search
                                    </button>
                                    <button
                                        onClick={clearSearchHistory}
                                        onMouseDown={clearSearchHistory}
                                        className="rounded-md border-2 border-indigo-600
                                            bg-white py-3 font-semibold text-black
                                            hover:bg-indigo-100"
                                    >
                                        Clear History
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleSearch}
                    className="w-full rounded-lg bg-indigo-600 py-3 font-semibold
                        text-white transition hover:bg-indigo-700"
                >
                    Search
                </button>
            </div>
            <div className="w-full max-w-4xl">
                {hasSearched && (
                    <>
                        {searchResults.length > 0 ? (
                            <div
                                className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2
                                    lg:grid-cols-3"
                            >
                                {searchResults.map((listing, index) => (
                                    <Listing listing={listing} key={index} />
                                ))}
                            </div>
                        ) : (
                            !searchLoading && (
                                <p className="text-gray-600">
                                    No listings found. Try searching for something else.
                                </p>
                            )
                        )}
                        {searchLoading && (
                            <div className="flex items-center justify-center">
                                <div
                                    className="h-8 w-8 animate-spin rounded-full border-4
                                        border-indigo-600 border-t-transparent"
                                ></div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
