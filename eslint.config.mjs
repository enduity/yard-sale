import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({
    baseDirectory: fileURLToPath(new URL('.', import.meta.url)),
});

export default [
    { files: ['**/*.ts', '**/*.tsx'] },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            '@typescript-eslint/no-unused-vars': 'warn',
        },
    },
    {
        ignores: ['.next/**'],
    },
];
