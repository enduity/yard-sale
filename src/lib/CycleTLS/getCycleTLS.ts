import initCycleTLS, { CycleTLSClient } from '@/lib/CycleTLS/client';
import { getCycleTLSPath } from '@/lib/CycleTLS/getCycleTLSPath';
import { createServer, AddressInfo } from 'node:net';

declare global {
    // Declare global variables to maintain the singleton instance
    var cycleTLSPromise: Promise<CycleTLSClient> | undefined;
    var isCycleTLSExitHandlerAttached: boolean | undefined;
    var proxy: string | undefined;
}

function getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.once('error', reject);
        server.listen(0, () => {
            const { port } = server.address() as AddressInfo;
            server.close((error) => (error ? reject(error) : resolve(port)));
        });
    });
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
        global.cycleTLSPromise = getAvailablePort().then((port) =>
            initCycleTLS({ executablePath, port }),
        );

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
