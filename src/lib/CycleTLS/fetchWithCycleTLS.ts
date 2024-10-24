import { CycleTLSClient, CycleTLSRequestOptions } from '@/lib/CycleTLS/CycleTLSEnhanced';
import ProxyManager from '@/lib/ProxyManager';

/**
 * Fetch a URL using CycleTLS with the given options.
 *
 * @param cycleTLS The CycleTLS client to use
 * @param url The URL to fetch
 * @param extraHeaders Extra headers to include in the request
 * @returns The response from the server
 */
export async function fetchWithCycleTLS(
    cycleTLS: CycleTLSClient,
    url: string,
    extraHeaders?: Record<string, string>,
) {
    const cycleTLSOptions: CycleTLSRequestOptions = {
        ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,10-51-0-11-35-5-16-27-65281-45-23-43-17513-18-65037-13,25497-29-23-24,0',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        headers: extraHeaders,
    };
    proxy = ProxyManager.getRandomUnblockedProxyUrl() ?? undefined;
    cycleTLSOptions.proxy = proxy;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await cycleTLS(url, cycleTLSOptions, 'get');
        } catch (error) {
            if (attempt < 3) {
                console.warn(
                    `CycleTLS fetch attempt ${attempt} failed for url ${url} with ${error}. Retrying in 0.5 seconds...`,
                );
                await new Promise((resolve) => setTimeout(resolve, 500));
            } else {
                if (proxy) {
                    const moreProxies = ProxyManager.blockProxy(proxy);
                    if (!moreProxies) {
                        throw new Error(`All proxies are likely blocked.`);
                    }
                }
                throw error;
            }
        }
    }
}
