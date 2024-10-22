import fetch, { RequestInit, Response } from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { RequestOptions } from 'http';
import { URL } from 'url';

interface Proxy {
    url: string;
    blocked: boolean;
}

// ESLint ignores to allow global variable declarations and modifications
/* eslint-disable no-var */

// Declare the global variable 'proxies' with proper TypeScript typing
declare global {
    var proxies: Proxy[] | undefined;
}

// Initialize the global 'proxies' variable if it hasn't been already
if (!global.proxies) {
    const proxiesEnv = process.env.YARD_SALE_PROXIES;

    if (proxiesEnv) {
        const proxyUrls = proxiesEnv
            .split(',')
            .map((url) => url.trim())
            .filter((url) => url); // Filter out empty strings

        if (proxyUrls.length > 0) {
            global.proxies = proxyUrls.map((url) => ({ url, blocked: false }));
        }
    }
}

class ProxyManager {
    private static getRandomUnblockedProxy(): Proxy | null {
        const proxies = global.proxies;
        if (!proxies || proxies.length === 0) {
            return null;
        }
        const unblockedProxies = proxies.filter((proxy) => !proxy.blocked);
        if (unblockedProxies.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * unblockedProxies.length);
        return unblockedProxies[randomIndex];
    }

    private static getAgent(): {
        agent?: RequestOptions['agent'] | ((parsedUrl: URL) => RequestOptions['agent']);
        proxy: Proxy | null;
    } {
        const proxy = this.getRandomUnblockedProxy();
        if (!proxy) {
            return { agent: undefined, proxy: null };
        }
        const proxyUrl = new URL(proxy.url);
        const protocol = proxyUrl.protocol;

        let agent;
        if (protocol.startsWith('http')) {
            agent = new HttpsProxyAgent(proxy.url);
        } else if (protocol.startsWith('socks')) {
            agent = new SocksProxyAgent(proxy.url);
        } else {
            throw new Error(`Unsupported proxy protocol: ${protocol}`);
        }

        return { agent, proxy };
    }

    public static async fetch(
        url: string,
        options: RequestInit = {},
        extraOptions?: {
            blockProxyOnError: boolean;
            maxAttempts: number;
        },
    ): Promise<Response> {
        let lastError;
        const maxAttempts = extraOptions?.maxAttempts || 3;
        const blockProxyOnError = extraOptions?.blockProxyOnError || false;

        while (true) {
            let attempts = 0;
            const proxyData = this.getAgent();
            const { agent, proxy } = proxyData;

            while (attempts < maxAttempts) {
                try {
                    const fetchOptions: RequestInit = {
                        ...options,
                        agent,
                    };
                    return await fetch(url, fetchOptions);
                } catch (error) {
                    attempts++;
                    lastError = error;
                }
            }

            if (proxy && blockProxyOnError) {
                proxy.blocked = true;
                console.error(`Proxy ${proxy.url} is likely blocked: ${lastError}`);
            } else {
                throw lastError;
            }
        }
    }

    public static getRandomUnblockedProxyUrl(): string | null {
        const proxy = this.getRandomUnblockedProxy();
        return proxy ? proxy.url : null;
    }

    /**
     * Block a proxy by URL.
     * @param proxyUrl
     * @returns If any unblocked proxies remain
     */
    public static blockProxy(proxyUrl: string): boolean {
        const proxies = global.proxies;
        if (!proxies) {
            return false;
        }
        const proxy = proxies.find((p) => p.url === proxyUrl);
        if (proxy) {
            proxy.blocked = true;
        }
        return proxies.some((p) => !p.blocked);
    }
}

export default ProxyManager;
