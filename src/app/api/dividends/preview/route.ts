// app/api/dividends/preview/route.ts
import { NextResponse } from 'next/server';
import { previewDividends } from '@/lib/dividends';

export async function GET() {
    try {
        const preview = await previewDividends();
        return NextResponse.json({ success: true, data: preview });
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
