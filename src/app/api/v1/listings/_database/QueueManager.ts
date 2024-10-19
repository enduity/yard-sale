import { prisma } from '@/lib/prisma';
import { ListingSource } from '@/types/listings';
import { SearchCriteria } from '@/types/search';
import { Prisma } from '@prisma/client';

type QueueProcessOutput = Prisma.QueueProcessGetPayload<{
    include: {
        Search: {
            include: {
                searchCriteria: true;
            };
        };
    };
}>;

export class QueueManager {
    public static async addToQueue(
        searchQuery: string,
        searchCriteria?: SearchCriteria,
    ): Promise<number> {
        const search = await prisma.search.create({
            data: {
                query: searchQuery,
            },
        });
        if (searchCriteria) {
            await prisma.searchCriteria.create({
                data: {
                    searchId: search.id,
                    ...searchCriteria,
                },
            });
        }
        const queueProcess = await prisma.queueProcess.create({
            data: {
                searchId: search.id,
                status: 'processing',
            },
        });
        return queueProcess.id;
    }

    public static async getQueueProcess(
        processId: number,
    ): Promise<QueueProcessOutput | null> {
        const queueProcess = await prisma.queueProcess.findFirst({
            where: { id: processId },
            include: { Search: { include: { searchCriteria: true } } },
        });
        if (!queueProcess) {
            return null;
        }
        return queueProcess;
    }

    public static async findQueueProcess(
        searchQuery: string,
        searchCriteria?: SearchCriteria,
        excludeId?: number,
    ): Promise<QueueProcessOutput | null> {
        const queueProcess = await prisma.queueProcess.findFirst({
            where: {
                Search: { query: searchQuery, searchCriteria: searchCriteria },
                id: { not: excludeId },
            },
            include: { Search: { include: { searchCriteria: true } } },
        });
        if (!queueProcess) {
            return null;
        }
        return queueProcess;
    }

    public static async finishQueueProcess(processId: number) {
        const queueProcess = await prisma.queueProcess.findFirst({
            where: { id: processId },
        });
        if (!queueProcess) {
            throw new Error('Queue process not found');
        }
        return prisma.queueProcess.update({
            where: { id: processId },
            data: { status: 'finished' },
        });
    }

    /**
     * Generate listings from an existing process by faking a proper generator.
     * This is used when another request matches a process that is already running.
     *
     * @param processId
     */
    public static async *generateFromExisting(processId: number) {
        while (true) {
            const process = await prisma.queueProcess.findFirst({
                where: { id: processId, status: 'processing' },
            });

            if (!process) {
                break;
            }

            const search = await prisma.search.findFirst({
                where: { QueueProcess: { id: processId } },
                include: { results: { include: { thumbnail: true } } },
            });

            if (!search) {
                break;
            }

            for (const result of search.results) {
                yield {
                    price: result.price,
                    title: result.title,
                    location: result.location,
                    thumbnailId: result.thumbnail?.id,
                    url: result.url,
                    source: result.source as ListingSource,
                };
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    /**
     * Wait until the given process ID is the next in line to finish.
     * We don't want to get blocked by anybody for making too many requests.
     *
     * @param processId - The ID of the process to wait for.
     */
    public static async waitUntilNextInLine(processId: number): Promise<void> {
        while (true) {
            const earliestPending = await prisma.queueProcess.findFirst({
                where: { status: 'processing' },
                orderBy: { id: 'asc' },
            });

            if (!earliestPending || earliestPending.id === processId) {
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
}
