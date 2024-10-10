import { distance as levenshteinDistance } from 'fastest-levenshtein';

export function getSuggestions(
    dictionary: string[],
    search: string,
    maxSuggestions: number = 5,
    maxDistance: number = 3
): string[] {
    if (!search) return [];
    const searchTermNormalized = search.toLowerCase().replace(/\s+/g, '');
    const previousSearchesNormalized = dictionary.map((term) => ({
        normalized: term.toLowerCase().replace(/\s+/g, ''),
        original: term,
    }));

    return previousSearchesNormalized
        .map(({ normalized, original }) => {
            if (
                searchTermNormalized.length < normalized.length &&
                searchTermNormalized.length >= 5
            ) {
                let minDistance = Infinity;
                for (
                    let i = 0;
                    i <= normalized.length - searchTermNormalized.length;
                    i++
                ) {
                    const distance = levenshteinDistance(
                        normalized.slice(i, i + searchTermNormalized.length),
                        searchTermNormalized
                    );
                    minDistance = Math.min(minDistance, distance);
                }
                return {
                    original,
                    distance: minDistance,
                };
            }

            return {
                original,
                distance: levenshteinDistance(normalized, searchTermNormalized),
            };
        })
        .filter((result) => result.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxSuggestions)
        .map((result) => result.original);
}
