import { SearchSuggestion } from '@/app/_components/SearchBar/SearchSuggestion';

export function SuggestionsDropdown({
    searchSuggestions,
    handleDropdownSelect,
    highlightedIndex,
    handleSearch,
    clearSearchHistory,
    searchTerm,
}: {
    searchSuggestions: string[];
    handleDropdownSelect: (term: string) => void;
    highlightedIndex: number;
    handleSearch: () => void;
    clearSearchHistory: () => void;
    searchTerm: string;
}) {
    return (
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
                    className="rounded-md bg-indigo-600 py-3 font-semibold text-white
                        hover:bg-indigo-700"
                >
                    Search
                </button>
                <button
                    onClick={clearSearchHistory}
                    className="rounded-md border-2 border-indigo-600 bg-white py-3
                        font-semibold text-black hover:bg-indigo-100"
                >
                    Clear History
                </button>
            </div>
        </>
    );
}
