import { clsx } from 'clsx';
import { ReactNode } from 'react';

export function CheckBoxOption({
    onClick,
    selected,
    children,
}: {
    onClick: () => void;
    selected: boolean;
    children: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className="flex flex-row items-center justify-between px-2 py-1"
        >
            <div
                className={clsx(
                    `relative mr-3 aspect-square size-5 items-center justify-center
                    rounded border-2 text-white`,
                    selected && 'border-indigo-500 bg-indigo-500',
                    !selected && 'border-gray-400',
                )}
            >
                <div
                    className={clsx(
                        'transition-maxWidth overflow-clip duration-500',
                        selected && 'visible max-w-4',
                        !selected && 'invisible max-w-0',
                    )}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                        />
                    </svg>
                </div>
            </div>
            <span className="text-nowrap">{children}</span>
        </button>
    );
}
