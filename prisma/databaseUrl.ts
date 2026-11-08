import path from 'node:path';

export function getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');

    const filename = url.slice('file:'.length);
    if (!url.startsWith('file:') || path.isAbsolute(filename)) return url;

    // Preserve Prisma's schema-relative SQLite paths when using a driver adapter.
    return `file:${path.resolve('prisma', filename)}`;
}
