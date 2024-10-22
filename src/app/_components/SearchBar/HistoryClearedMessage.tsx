import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

export function HistoryClearedMessage({ handleHidden }: { handleHidden: () => void }) {
    const [startTransition, setStartTransition] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setStartTransition(true);
        }, 2000);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div
            className={clsx(
                `pointer-events-none absolute left-0 top-0 flex h-full w-full items-center
                justify-center rounded-lg border-2 border-emerald-800 bg-green-200
                text-center font-semibold transition-opacity duration-150`,
                startTransition ? 'opacity-0 duration-1000' : 'opacity-100 duration-150',
            )}
            onTransitionEnd={handleHidden}
        >
            Search history cleared!
        </div>
    );
}
