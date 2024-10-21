import { Listing as ListingModel, ListingSource } from '@/types/listings';
import Image from 'next/image';

export function Listing({ listing }: { listing: ListingModel }) {
    const listingSourceToName = {
        [ListingSource.OstaEE]: 'Osta.ee',
        [ListingSource.Okidoki]: 'Okidoki',
        [ListingSource.Marketplace]: 'Facebook',
    };

    return (
        <a
            className="relative flex flex-col rounded-lg bg-white p-4 shadow-md"
            href={listing.url}
            target="_blank"
            rel="noreferrer"
        >
            <div
                className="relative mb-4 aspect-square w-full max-w-full overflow-hidden
                    rounded-md"
            >
                <Image
                    src={`/api/v1/thumbnails/${listing.thumbnailId}`}
                    alt={listing.title}
                    className="object-cover"
                    fill={true}
                />
            </div>
            <div className="flex flex-grow flex-col">
                <h2 className="mb-1 break-words text-lg font-semibold text-gray-800">
                    {listing.title}
                </h2>
                <p className="mb-2 text-sm text-gray-600">{listing.location}</p>
                <div className="flex flex-grow flex-row items-end justify-between">
                    <span className="text-xl font-bold text-indigo-600">
                        {listing.price.toString()} €
                    </span>
                    <span className="text-sm text-gray-600">
                        {listingSourceToName[listing.source]}
                    </span>
                </div>
            </div>
        </a>
    );
}
