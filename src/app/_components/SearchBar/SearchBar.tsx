import { ChangeEvent, KeyboardEvent, useState } from 'react';
import { clsx } from 'clsx';
import { SearchSuggestion } from '@/app/_components/SearchBar/SearchSuggestion';
import { getSuggestions } from '@/app/_util/getSuggestions';
import { HistoryClearedMessage } from '@/app/_components/SearchBar/HistoryClearedMessage';
import SearchInput from '@/app/_components/SearchBar/SearchInput';
import { SearchOptionsState } from '@/types/requests';
import { SearchOptionPill } from '@/app/_components/SearchBar/options/SearchOptionPill';
import { SearchOption } from '@/app/_components/SearchBar/options/SearchOption';
import { BulletOption } from '@/app/_components/SearchBar/options/BulletOption';
import { Condition } from '@/types/search';
import { usePreviousSearches } from '@/app/_util/usePreviousSearches';

interface SearchBarProps {
    handleSearch: (searchTerm: string, searchOptions: SearchOptionsState) => void;
}

export function SearchBar({ handleSearch }: SearchBarProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOptions, setSearchOptions] = useState<SearchOptionsState>({});
    const [showHistoryCleared, setShowHistoryCleared] = useState(false);
    const { previousSearches, updatePreviousSearches, clearSearchHistory } =
        usePreviousSearches();
    const searchSuggestions = getSuggestions(previousSearches, searchTerm, 5);

    const [openedOption, setOpenedOption] = useState('');

    const internalHandleSearch = () => {
        handleSearch(searchTerm, searchOptions);
        updatePreviousSearches(searchTerm);
    };

    const SuggestionsDropdown = () => (
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
                    onClick={internalHandleSearch}
                    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                    className="rounded-md bg-indigo-600 py-3 font-semibold text-white
                        hover:bg-indigo-700"
                >
                    Search
                </button>
                <button
                    onClick={clearSearchHistory}
                    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                    className="rounded-md border-2 border-indigo-600 bg-white py-3
                        font-semibold text-black hover:bg-indigo-100"
                >
                    Clear History
                </button>
            </div>
        </>
    );

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        switch (event.key) {
            case 'Enter':
                if (
                    highlightedIndex >= 0 &&
                    highlightedIndex < searchSuggestions.length
                ) {
                    handleDropdownSelect(searchSuggestions[highlightedIndex]);
                } else {
                    internalHandleSearch();
                }
                setShowDropdown(false);
                break;
            case 'ArrowDown':
                setHighlightedIndex((prev) =>
                    Math.min(prev + 1, searchSuggestions.length - 1),
                );
                event.preventDefault();
                break;
            case 'ArrowUp':
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                event.preventDefault();
                break;
            case 'Tab':
                if (showDropdown && searchSuggestions.length > 0) {
                    setHighlightedIndex((prev) => (prev + 1) % searchSuggestions.length);
                    event.preventDefault();
                }
                break;
            default:
                break;
        }
    };

    const handleDropdownSelect = (term: string) => {
        setSearchTerm(term);
        setShowDropdown(false);
        setHighlightedIndex(-1);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setShowDropdown(true);
        setHighlightedIndex(-1);
    };

    const handleBlur = () => {
        // Delay hiding the dropdown to allow click events to register
        setTimeout(() => setShowDropdown(false), 100);
    };

    return (
        <div className="relative z-10 mb-6 w-full max-w-xl">
            <div className="relative mb-2 h-14 w-full">
                <div
                    className="absolute left-0 top-0 z-20 w-full overflow-clip rounded-lg
                        bg-white focus-within:ring-2 focus-within:ring-indigo-500"
                >
                    <div className="relative">
                        <SearchInput
                            value={searchTerm}
                            onInputChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                            className={clsx({
                                'rounded-b-none border-0 border-b':
                                    showDropdown && searchSuggestions.length > 0,
                            })}
                        />
                        {showHistoryCleared && (
                            <HistoryClearedMessage
                                handleHidden={() => setShowHistoryCleared(false)}
                            />
                        )}
                    </div>
                    {showDropdown && searchSuggestions.length > 0 && (
                        <SuggestionsDropdown />
                    )}
                </div>
            </div>
            <div className="mb-4 flex flex-row gap-2">
                <SearchOptionPill
                    text={
                        searchOptions.condition
                            ? {
                                  [Condition.New]: 'New',
                                  [Condition.Used]: 'Used',
                              }[searchOptions.condition]
                            : 'Condition'
                    }
                    optionUsed={searchOptions.condition !== undefined}
                    dropdownActive={openedOption === 'Condition'}
                    onToggle={() =>
                        openedOption === 'Condition'
                            ? setOpenedOption('')
                            : setOpenedOption('Condition')
                    }
                    onClose={() => setOpenedOption('')}
                >
                    <SearchOption name="Condition" onClose={() => setOpenedOption('')}>
                        <BulletOption
                            onClick={() =>
                                setSearchOptions({
                                    ...searchOptions,
                                    condition: undefined,
                                })
                            }
                            selected={searchOptions.condition === undefined}
                        >
                            All
                        </BulletOption>
                        <BulletOption
                            onClick={() =>
                                setSearchOptions({
                                    ...searchOptions,
                                    condition: Condition.New,
                                })
                            }
                            selected={searchOptions.condition === Condition.New}
                        >
                            New
                        </BulletOption>
                        <BulletOption
                            onClick={() =>
                                setSearchOptions({
                                    ...searchOptions,
                                    condition: Condition.Used,
                                })
                            }
                            selected={searchOptions.condition === Condition.Used}
                        >
                            Used
                        </BulletOption>
                    </SearchOption>
                </SearchOptionPill>
                <SearchOptionPill
                    text={
                        searchOptions.maxDaysListed
                            ? `${searchOptions.maxDaysListed === 1 ? '24 hours' : `${searchOptions.maxDaysListed} days`}`
                            : 'Listed'
                    }
                    optionUsed={searchOptions.maxDaysListed !== undefined}
                    dropdownActive={openedOption === 'Listed'}
                    onToggle={() =>
                        openedOption === 'Listed'
                            ? setOpenedOption('')
                            : setOpenedOption('Listed')
                    }
                    onClose={() => setOpenedOption('')}
                >
                    <SearchOption name="Listed" onClose={() => setOpenedOption('')}>
                        <BulletOption
                            onClick={() =>
                                setSearchOptions({
                                    ...searchOptions,
                                    maxDaysListed: undefined,
                                })
                            }
                            selected={searchOptions.maxDaysListed === undefined}
                        >
                            All
                        </BulletOption>
                        {[1, 7, 30].map((days) => (
                            <BulletOption
                                key={days}
                                onClick={() =>
                                    setSearchOptions({
                                        ...searchOptions,
                                        maxDaysListed: days as 1 | 7 | 30,
                                    })
                                }
                                selected={searchOptions.maxDaysListed === days}
                            >
                                Past {days > 1 ? `${days} days` : '24 hours'}
                            </BulletOption>
                        ))}
                    </SearchOption>
                </SearchOptionPill>
            </div>
            <button
                onClick={internalHandleSearch}
                className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white
                    transition hover:bg-indigo-700"
            >
                Search
            </button>
        </div>
    );
}
