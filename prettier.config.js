module.exports = {
    endOfLine: 'lf',
    tabWidth: 4,
    useTabs: false,
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    plugins: [
        'prettier-plugin-tailwindcss',
        'prettier-plugin-classnames',
        'prettier-plugin-merge'
    ],
    tailwindFunctions: [
        'clsx'
    ],
    endingPosition: 'absolute-with-indent',
    printWidth: 90,
};
