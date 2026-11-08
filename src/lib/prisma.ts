// noinspection ES6ConvertVarToLetConst

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getDatabaseUrl } from '../../prisma/databaseUrl';

const prismaClientSingleton = () => {
    const adapter = new PrismaBetterSqlite3({ url: getDatabaseUrl() });
    return new PrismaClient({ adapter });
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
