import { clsx } from 'clsx';

type SearchSuggestionProps = {
    text: string;
    onSelect: (text: string) => void;
    isHighlighted: boolean;
    searchText: string;
};

export function SearchSuggestion({
    text,
    onSelect,
    isHighlighted,
    searchText,
}: SearchSuggestionProps) {
    const textParts = [];
    let remainingText = text;
    for (const word of searchText.split(' ')) {
        const index = remainingText.toLowerCase().indexOf(word.toLowerCase());
        if (index === -1) {
            break;
        }
        textParts.push({ text: remainingText.slice(0, index), isHighlighted: false });
        textParts.push({
            text: remainingText.slice(index, index + word.length),
            isMatch: true,
        });
        remainingText = remainingText.slice(index + word.length);
    }
    textParts.push({ text: remainingText, isHighlighted: false });

    return (
        <div
            onClick={() => onSelect(text)}
            onMouseDown={() => onSelect(text)}
            className={clsx(
                'pointer-events-auto relative cursor-pointer px-4 py-3 hover:bg-gray-200',
                isHighlighted && 'bg-gray-200',
            )}
            role="button"
        >
            {textParts.map(({ text, isMatch }, index) => (
                <span key={index} className={clsx(!isMatch && 'font-bold')}>
                    {text}
                </span>
            ))}
        </div>
    );
}
