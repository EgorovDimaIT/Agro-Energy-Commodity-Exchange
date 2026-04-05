// app/api/tokens/specs/route.ts
import { NextResponse } from 'next/server';
import { COMMODITY_TOKENS } from '@/lib/store';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (symbol) {
        const token = COMMODITY_TOKENS[symbol as keyof typeof COMMODITY_TOKENS];
        if (!token) {
            return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }
        return NextResponse.json({ token });
    }

    // Все токены
    const summary = Object.values(COMMODITY_TOKENS).map(t => ({
        symbol: t.symbol,
        name: t.name,
        emoji: t.emoji,
        commodity: t.commodity,
        unit: t.unit,
        supply: t.supply,
        priceUSD: t.priceUSD,
        totalValueUSD: t.totalValueUSD,
        location: t.location.port,
        country: t.location.country,
        mint: t.mint,
    }));

    const totalTVL = Object.values(COMMODITY_TOKENS).reduce(
        (acc, t) => acc + t.totalValueUSD, 0
    );

    return NextResponse.json({
        tokens: summary,
        totalTVL,
        count: summary.length,
    });
}
