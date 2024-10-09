'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { Listing } from '@/types';
import { clsx } from 'clsx';
import { getLevenshteinDistance } from './_util/getLevenshteinDistance';

function getSearchSuggestions(
    previousSearches: string[],
    searchTerm: string,
    maxSuggestions: number = 5
): string[] {
    if (!searchTerm) return [];

    return previousSearches
        .map((term) => ({
            term,
            distance: getLevenshteinDistance(
                term.toLowerCase(),
                searchTerm.toLowerCase()
            ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxSuggestions)
        .map((result) => result.term);
}

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Listing[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [previousSearches, setPreviousSearches] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    useEffect(() => {
        const storedSearches = localStorage.getItem('previousSearches');
        if (storedSearches) {
            setPreviousSearches(JSON.parse(storedSearches));
        }
    }, []);

    const handleSearch = async () => {
        if (!searchTerm) return;
        if (!hasSearched) setHasSearched(true);
        setSearchLoading(true);

        const response = await fetch(
            `/api/marketplace?searchTerm=${encodeURIComponent(searchTerm)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        const data = await response.json();
        setSearchResults(data['listings']);

        const updatedSearches = [
            searchTerm,
            ...previousSearches.filter((term) => term !== searchTerm),
        ].slice(0, 10);
        setPreviousSearches(updatedSearches);
        setSearchLoading(false);

        localStorage.setItem('previousSearches', JSON.stringify(updatedSearches));
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            if (highlightedIndex >= 0 && highlightedIndex < searchSuggestions.length) {
                handleDropdownSelect(searchSuggestions[highlightedIndex]);
            } else {
                void handleSearch();
            }
            setShowDropdown(false);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((prevIndex) =>
                Math.min(prevIndex + 1, searchSuggestions.length - 1)
            );
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        } else if (event.key === 'Tab' && showDropdown) {
            event.preventDefault();
            setHighlightedIndex(
                (prevIndex) => (prevIndex + 1) % searchSuggestions.length
            );
        }
    };

    const handleDropdownSelect = (term: string) => {
        setSearchTerm(term);
        setShowDropdown(false);
        setHighlightedIndex(-1);
    };

    const searchSuggestions = getSearchSuggestions(previousSearches, searchTerm, 5);

    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-100 px-4 py-8">
            <h1 className="mb-6 text-4xl font-bold text-gray-800">Yard Sale</h1>
            <p className="mb-4 text-lg text-gray-600">
                Find the best deals on used items across different platforms.
            </p>
            <div className="mb-6 w-full max-w-xl">
                <div className="relative mb-4 h-14 w-full">
                    <div
                        className="absolute left-0 top-0 w-full overflow-clip rounded-lg
                            focus-within:ring-2 focus-within:ring-indigo-500"
                    >
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
                                `w-full rounded-lg border border-gray-300 p-4 shadow-sm
                                focus:outline-none`,
                                showDropdown &&
                                    searchSuggestions.length > 0 &&
                                    'rounded-b-none border-0 border-b'
                            )}
                        />
                        {showDropdown && searchSuggestions.length > 0 && (
                            <div className="max-h-48 rounded-lg rounded-t-none bg-white">
                                {searchSuggestions.map((term, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleDropdownSelect(term)}
                                        onMouseDown={() => handleDropdownSelect(term)}
                                        className={clsx(
                                            `pointer-events-auto relative cursor-pointer
                                            px-4 py-3 hover:bg-gray-100`,
                                            index === highlightedIndex && 'bg-gray-200',
                                            index === searchSuggestions.length - 1 &&
                                                'rounded-b-lg'
                                        )}
                                        role="button"
                                    >
                                        {term}
                                    </div>
                                ))}
                            </div>
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
                {hasSearched &&
                    (searchLoading ? (
                        <div>
                            <div className="flex items-center justify-center">
                                <div
                                    className="h-8 w-8 animate-spin rounded-full border-4
                                        border-indigo-600 border-t-transparent"
                                ></div>
                            </div>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div
                            className="grid grid-cols-1 gap-6 md:grid-cols-2
                                lg:grid-cols-3"
                        >
                            {searchResults.map((listing, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col rounded-lg bg-white p-4
                                        shadow-md"
                                >
                                    <img
                                        src={`/api/thumbnail?id=${listing.thumbnailId}`}
                                        alt={listing.title}
                                        className="mb-4 h-48 w-full rounded-md
                                            object-cover"
                                    />
                                    <div className="flex flex-grow flex-col">
                                        <h2
                                            className="mb-1 text-lg font-semibold
                                                text-gray-800"
                                        >
                                            {listing.title}
                                        </h2>
                                        <p className="mb-2 text-sm text-gray-600">
                                            {listing.location}
                                        </p>
                                        <p className="text-xl font-bold text-indigo-600">
                                            ${listing.price.toString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-600">
                            No listings found. Try searching for something else.
                        </p>
                    ))}
            </div>
        </div>
    );
}
