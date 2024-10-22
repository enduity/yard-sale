import React from 'react';
import { clsx } from 'clsx';

export function SearchInput({
    value,
    onInputChange,
    onKeyDown,
    onBlur,
    className,
}: {
    value: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    className?: string;
}) {
    return (
        <input
            type="text"
            placeholder="Search for used items..."
            value={value}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            className={clsx(
                `w-full rounded-lg border border-gray-300 p-4 shadow-sm focus:border-0
                focus:outline-none`,
                className,
            )}
        />
    );
}

export default SearchInput;
