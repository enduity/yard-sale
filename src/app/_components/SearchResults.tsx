import { Listing as ListingModel } from '@/types/listings';
import { Listing } from '@/app/_components/Listing';

interface SearchResultsProps {
    hasSearched: boolean;
    searchResults: ListingModel[];
    searchLoading: boolean;
}

export function SearchResults({
    hasSearched,
    searchResults,
    searchLoading,
}: SearchResultsProps) {
    return (
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
    );
}
