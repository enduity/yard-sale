import { Listing as ListingModel } from '@/types/listings';
import { Listing } from '@/app/_components/Listing';
import { clsx } from 'clsx';

interface SearchResultsProps {
    searchResults: ListingModel[];
    searchLoading: boolean;
    searchError?: string;
}

export function SearchResults({
    searchResults,
    searchLoading,
    searchError,
}: SearchResultsProps) {
    return (
        <>
            {searchResults.length > 0 ? (
                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((listing, index) => (
                        <Listing listing={listing} key={index} />
                    ))}
                </div>
            ) : (
                !searchLoading && (
                    <p
                        className={clsx(
                            'text-lg',
                            searchError === undefined ? 'text-gray-600' : 'text-red-800',
                        )}
                    >
                        {searchError ??
                            'No results found. Try a different search term or filters.'}
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
    );
}
