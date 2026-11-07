import { useSyncExternalStore } from 'react';

const HISTORY_CHANGED = 'previous-searches-changed';

function subscribe(onChange: () => void) {
    window.addEventListener('storage', onChange);
    window.addEventListener(HISTORY_CHANGED, onChange);
    return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(HISTORY_CHANGED, onChange);
    };
}

function getSnapshot() {
    return localStorage.getItem('previousSearches');
}

function getServerSnapshot() {
    return null;
}

export function usePreviousSearches() {
    const storedSearches = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );
    const previousSearches: string[] = storedSearches ? JSON.parse(storedSearches) : [];

    const updatePreviousSearches = (searchTerm: string) => {
        const updatedSearches = [
            searchTerm,
            ...previousSearches.filter((term) => term !== searchTerm),
        ].slice(0, 10);
        localStorage.setItem('previousSearches', JSON.stringify(updatedSearches));
        window.dispatchEvent(new Event(HISTORY_CHANGED));
    };

    const clearSearchHistory = () => {
        localStorage.removeItem('previousSearches');
        window.dispatchEvent(new Event(HISTORY_CHANGED));
    };

    return { previousSearches, updatePreviousSearches, clearSearchHistory };
}
