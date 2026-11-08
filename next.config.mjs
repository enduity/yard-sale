// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['@prisma/adapter-better-sqlite3', 'cycletls'],
};

export default nextConfig;
