import initCycleTLS, { CycleTLSClient } from '@/lib/CycleTLS/CycleTLSEnhanced';
import { getCycleTLSPath } from '@/lib/CycleTLS/getCycleTLSPath';

declare global {
    // Declare global variables to maintain the singleton instance
    // eslint-disable-next-line no-var
    var cycleTLSPromise: Promise<CycleTLSClient> | undefined;
    // eslint-disable-next-line no-var
    var isCycleTLSExitHandlerAttached: boolean | undefined;
    // eslint-disable-next-line no-var
    var proxy: string | undefined;
}

export function getCycleTLS(): Promise<CycleTLSClient> {
    if (typeof window !== 'undefined') {
        throw new Error('CycleTLS can only be used on the server side.');
    }

    if (global.cycleTLSPromise === undefined) {
        const executablePath = getCycleTLSPath();
        global.proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
        if (global.proxy) {
            console.info(`CycleTLS using proxy: ${global.proxy}`);
        }
        global.cycleTLSPromise = initCycleTLS({
            executablePath,
        });

        // Attach an exit handler to clean up the CycleTLS process
        if (!global.isCycleTLSExitHandlerAttached) {
            global.isCycleTLSExitHandlerAttached = true;
            process.on('exit', async () => {
                const cycleTLS = await global.cycleTLSPromise;
                cycleTLS?.exit();
                global.cycleTLSPromise = undefined;
            });
        }
    }
    return global.cycleTLSPromise;
}
