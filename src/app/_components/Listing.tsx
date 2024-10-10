import { Listing as ListingModel } from '@/types';
import Image from 'next/image';

export function Listing({ listing }: { listing: ListingModel }) {
    return (
        <div className="relative flex flex-col rounded-lg bg-white p-4 shadow-md">
            <div
                className="relative mb-4 aspect-square w-full max-w-full overflow-hidden
                    rounded-md"
            >
                <Image
                    src={`/api/thumbnail?id=${listing.thumbnailId}`}
                    alt={listing.title}
                    className="object-cover"
                    fill={true}
                />
            </div>
            <div className="flex flex-grow flex-col">
                <h2 className="mb-1 text-lg font-semibold text-gray-800">
                    {listing.title}
                </h2>
                <p className="mb-2 text-sm text-gray-600">{listing.location}</p>
                <p className="text-xl font-bold text-indigo-600">
                    ${listing.price.toString()}
                </p>
            </div>
        </div>
    );
}
