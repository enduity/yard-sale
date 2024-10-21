import { clsx } from 'clsx';
import { ReactNode } from 'react';

export function BulletOption({
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
                    `relative mr-3 aspect-square size-3.5 rounded-full border-2
                    border-white outline outline-2 outline-gray-400`,
                    selected && 'outline-indigo-500',
                )}
            >
                <div
                    className={clsx(
                        `size-full rounded-full bg-indigo-500 transition-transform
                        duration-200 ease-out`,
                        !selected && 'invisible scale-[0.2]',
                        selected && 'visible scale-100',
                    )}
                />
            </div>
            <span className="text-nowrap">{children}</span>
        </button>
    );
}
