import { ReactNode, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from '@/app/_components/SearchBar/icons';
import { clsx } from 'clsx';

export function SearchOptionPill({
    text,
    optionUsed,
    dropdownActive,
    onToggle,
    onClose,
    children,
}: {
    text: string;
    optionUsed: boolean;
    dropdownActive: boolean;
    onToggle: () => void;
    onClose: () => void;
    children: ReactNode;
}) {
    const optionContainer = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                optionContainer.current &&
                event.target instanceof HTMLElement &&
                !optionContainer.current.contains(event.target) &&
                dropdownActive
            ) {
                onClose();
            }
        }

        document.addEventListener('mousedown', handleClickOutside, { capture: true });

        return () => {
            document.removeEventListener('mousedown', handleClickOutside, {
                capture: true,
            });
        };
    }, [onClose]);

    return (
        <div className="relative" ref={optionContainer}>
            <button
                className={clsx(
                    `flex flex-row items-center rounded-lg border border-gray-300 py-1
                    pl-3 pr-1.5 text-gray-700 transition-colors duration-100 ease-out
                    hover:bg-white hover:bg-opacity-60 hover:text-gray-800`,
                    dropdownActive && 'bg-white',
                    optionUsed && 'border-indigo-400 bg-indigo-50 hover:bg-indigo-100',
                )}
                onClick={onToggle}
            >
                <span className="mr-0.5">{text}</span>
                {dropdownActive ? <ChevronUp /> : <ChevronDown />}
            </button>
            {dropdownActive && (
                <div className="absolute left-0 top-full pt-2">{children}</div>
            )}
        </div>
    );
}
