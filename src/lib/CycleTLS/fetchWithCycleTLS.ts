import { CycleTLSClient, CycleTLSRequestOptions } from '@/lib/CycleTLS/client';
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
    /**
     * Fingerprint matching Chrome 153 (verified against Chrome 153 in 2026-11):
     * cipher set hashes to the current Chrome JA4 (8daaf6152771), extensions
     * include X25519MLKEM768 key share (4588), application_settings (0x44CD)
     * and ECH GREASE (0xFE0D), HTTP/2 settings and pseudo-header order match
     * what Chrome sends. Old fixed fingerprints (2024 era) are challenged by
     * osta.ee's Cloudflare bot protection.
     */
    const cycleTLSOptions: CycleTLSRequestOptions = {
        ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,43-51-13-65037-17613-27-11-18-45-0-65281-5-35-23-10-16-41,4588-29-23-24,0',
        http2Fingerprint: '1:65536;2:0;4:6291456;6:262144|15663105|0|m,a,s,p',
        headerOrder: [
            'sec-ch-ua',
            'sec-ch-ua-mobile',
            'sec-ch-ua-platform',
            'upgrade-insecure-requests',
            'user-agent',
            'accept',
            'sec-fetch-site',
            'sec-fetch-mode',
            'sec-fetch-user',
            'sec-fetch-dest',
            'accept-encoding',
            'accept-language',
        ],
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
        headers: {
            accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'et-EE,et;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-fetch-site': 'none',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-user': '?1',
            'sec-fetch-dest': 'document',
            ...extraHeaders,
        },
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
