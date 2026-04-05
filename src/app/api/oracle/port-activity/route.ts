// app/api/oracle/port-activity/route.ts
import { NextResponse } from 'next/server';
import { getPortActivity } from '@/lib/ais-oracle';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json(
            { error: 'token parameter required (oBBL, oWHT, etc.)' },
            { status: 400 }
        );
    }

    try {
        const result = await getPortActivity(token, 6000);

        return NextResponse.json({
            success: true,
            data: result,
            meta: {
                source: result.source,
                timestamp: new Date().toISOString(),
                isLive: result.source === 'LIVE_AIS',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: `Oracle error: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
