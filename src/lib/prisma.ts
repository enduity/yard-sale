// noinspection ES6ConvertVarToLetConst

import { PrismaClient } from '@/generated/prisma/client';
import { getDatabaseUrl } from '../../prisma/databaseUrl';

const prismaClientSingleton = () => {
    return new PrismaClient({ datasourceUrl: getDatabaseUrl() });
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
