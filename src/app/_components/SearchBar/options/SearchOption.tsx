import { ReactNode } from 'react';

export function SearchOption({
    name,
    onClose,
    children,
}: {
    name: string;
    onClose: () => void;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col rounded-lg border bg-white px-4 py-3 shadow-md">
            <div className="flex min-w-32 flex-row items-center justify-between">
                <span className="font-semibold text-gray-800">{name}</span>
                <button onClick={onClose} className="text-gray-500">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
            <div className="mt-2 flex flex-col items-start">{children}</div>
        </div>
    );
}
