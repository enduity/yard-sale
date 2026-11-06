import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const thumbnail = await prisma.thumbnail.findUnique({
        where: { id: Number(id) },
    });

    if (!thumbnail) {
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(Buffer.from(thumbnail.image), {
        headers: { 'Content-Type': 'image/jpeg' },
    });
}
