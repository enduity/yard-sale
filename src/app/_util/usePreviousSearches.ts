import { useEffect, useState } from 'react';

export function usePreviousSearches() {
    const [previousSearches, setPreviousSearches] = useState<string[]>([]);

    useEffect(() => {
        const storedSearches = localStorage.getItem('previousSearches');
        if (storedSearches) {
            setPreviousSearches(JSON.parse(storedSearches));
        }
    }, []);

    const updatePreviousSearches = (searchTerm: string) => {
        const updatedSearches = [
            searchTerm,
            ...previousSearches.filter((term) => term !== searchTerm),
        ].slice(0, 10);
        setPreviousSearches(updatedSearches);
        localStorage.setItem('previousSearches', JSON.stringify(updatedSearches));
    };

    const clearSearchHistory = () => {
        setPreviousSearches([]);
        localStorage.removeItem('previousSearches');
    };

    return { previousSearches, updatePreviousSearches, clearSearchHistory };
}
