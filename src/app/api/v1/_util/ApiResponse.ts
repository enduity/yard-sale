import { NextResponse } from 'next/server';

export class ApiResponse {
    static noRequiredParameter(parameter: string): NextResponse {
        return NextResponse.json(
            {
                message: `Required parameter '${parameter}' not specified.`,
            },
            { status: 400 },
        );
    }

    static invalidParameter(parameter: string): NextResponse {
        return NextResponse.json(
            {
                message: `Parameter '${parameter}' is invalid.`,
            },
            { status: 400 },
        );
    }

    static internalError(details: string | null = null): NextResponse {
        return NextResponse.json({
            message: details ?? 'Unknown error occurred.',
        });
    }

    static accepted(taskId: number, monitorUrl: string): NextResponse {
        return NextResponse.json(
            {
                message: 'Added to queue',
                taskId,
                monitorUrl,
            },
            { status: 202 },
        );
    }

    static notFound(): NextResponse {
        return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    static rateLimited(retryAfter: Date): NextResponse {
        return NextResponse.json(
            {
                message: 'Too many requests, please try again later.',
                retryAfter: retryAfter.toUTCString(),
            },
            { status: 429, headers: { 'Retry-After': retryAfter.toUTCString() } },
        );
    }
}
