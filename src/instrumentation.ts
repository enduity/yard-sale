import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function register() {
    /**
     * Delete all processing queue processes left over from previous runs
     */
    const deletedQueueProcess = await prisma.queueProcess.deleteMany({
        where: {
            status: 'processing',
        },
    });
    console.log(`Deleted ${deletedQueueProcess.count} processing queue processes`);
    /**
     * Delete all searches that have no results left over from previous runs
     */
    const deletedSearch = await prisma.search.deleteMany({
        where: {
            results: {
                none: {},
            },
        },
    });
    console.log(`Deleted ${deletedSearch.count} searches with no results`);
}
