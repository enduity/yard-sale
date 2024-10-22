import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type RateLimitRequest = {
    ip: string;
    userAgent: string;
    time: Date;
    pathname: string;
};
const rateLimitRequests: RateLimitRequest[] = [];
const RATE_LIMITS = {
    '/api/v1/listings': { limit: 2, window: 5 * 60 * 1000 }, // 2 requests per 5 minutes
    '/api/v1/thumbnails': { limit: 100, window: 60 * 1000 }, // 100 requests per minute
};
const EXPIRATION_TIME =
    Object.entries(RATE_LIMITS).reduce(
        (acc, [, { window }]) => Math.max(acc, window),
        0,
    ) +
    5 * 60 * 1000; // 5 minutes after the longest window

function calculateRetryAfter(ip: string, userAgent: string, pathname: string) {
    const now = Date.now();
    const rateLimitConfig = Object.entries(RATE_LIMITS).find(([key]) =>
        pathname.startsWith(key),
    );
    if (!rateLimitConfig) return NextResponse.next(); // If no specific rate limit, proceed normally
    const { limit, window } = rateLimitConfig[1];

    const requests = rateLimitRequests.filter(
        (request) =>
            request.ip === ip &&
            request.userAgent === userAgent &&
            request.pathname === pathname &&
            request.time.getTime() > now - window,
    );

    const overLimit = requests.length - limit;
    if (overLimit <= 0) return 0;

    const earliestRetryTime = requests[overLimit].time.getTime() + window;
    return Math.ceil((earliestRetryTime - now) / 1000);
}

export async function middleware(request: NextRequest) {
    let ip: string | undefined = request.ip;
    // If undefined, reject the request
    if (!ip) {
        const forwardedFor = request.headers.get('X-Forwarded-For');
        if (forwardedFor) {
            ip = forwardedFor.split(',')[0];
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }
    const userAgent = request.headers.get('User-Agent');
    if (!userAgent) return new NextResponse('Forbidden', { status: 403 });
    const currentTime = Date.now();
    const pathname = request.nextUrl.pathname;

    rateLimitRequests.push({ ip, userAgent, time: new Date(currentTime), pathname });
    const retryAfter = calculateRetryAfter(ip, userAgent, pathname);
    if (retryAfter) {
        return new NextResponse('Rate limit exceeded', {
            status: 429,
            headers: { 'Retry-After': String(retryAfter) },
        });
    }

    // Remove expired requests to prevent infinite growth of memory usage
    rateLimitRequests.splice(
        0,
        rateLimitRequests.findIndex(
            (request) => currentTime - request.time.getTime() < EXPIRATION_TIME,
        ),
    );

    return NextResponse.next();
}

export const config = {
    matcher: '/api/v1/:path*',
};
