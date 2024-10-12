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
    for (const word of searchText.split(' ')) {
        const index = text.toLowerCase().indexOf(word.toLowerCase());
        if (index === -1) {
            break;
        }
        textParts.push({ text: text.slice(0, index), isHighlighted: false });
        textParts.push({
            text: text.slice(index, index + word.length),
            isMatch: true,
        });
        text = text.slice(index + word.length);
    }
    textParts.push({ text, isHighlighted: false });
    text = textParts.map(({ text }) => text).join('');

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
