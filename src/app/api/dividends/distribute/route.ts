// app/api/dividends/distribute/route.ts
import { NextResponse } from 'next/server';
import { distributeDividends } from '@/lib/dividends';
import { addActivity } from '@/lib/store';

export async function POST() {
    try {
        const result = await distributeDividends();

        if (result.success) {
            addActivity(
                'VAULT',
                '💰 Dividends Distributed',
                `${result.totalDistributed.toFixed(4)} SOL → ${result.holdersCount} holders`,
                result.txSignatures[0]
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
