// src/app/api/feed/route.ts
import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

const HELIUS_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const TOKEN_MINT = process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT!;

// ── Получаем реальные транзакции с Helius ──
async function fetchTokenTransactions() {
    try {
        const response = await fetch(HELIUS_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getSignaturesForAddress',
                params: [
                    TOKEN_MINT,
                    { limit: 20, commitment: 'confirmed' },
                ],
            }),
        });

        const data = await response.json();
        const signatures = data.result || [];

        // Форматируем в читаемый вид
        return signatures.map((sig: any) => ({
            wallet: 'On-chain',
            action: '🔄 Transaction',
            detail: `Token activity: ${sig.signature.slice(0, 8)}...`,
            timestamp: new Date(sig.blockTime * 1000).toISOString(),
            txSignature: sig.signature,
            explorerUrl: `https://explorer.solana.com/tx/${sig.signature}?cluster=devnet`,
        }));
    } catch (error) {
        console.error('Helius fetch error:', error);
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'all';

    try {
        let feed = [];

        // ── Наши локальные события (голосования, релизы) ──
        const localFeed = store.activityFeed.map(item => ({
            ...item,
            explorerUrl: item.txSignature
                ? `https://explorer.solana.com/tx/${item.txSignature}?cluster=devnet`
                : null,
        }));

        if (source === 'local') {
            feed = localFeed;
        } else if (source === 'onchain') {
            // ── Реальные on-chain транзакции через Helius ──
            const onchainFeed = await fetchTokenTransactions();
            feed = onchainFeed;
        } else {
            // ── Объединяем всё ──
            const onchainFeed = await fetchTokenTransactions();
            feed = [...localFeed, ...onchainFeed]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 30);
        }

        return NextResponse.json({
            feed,
            count: feed.length,
            tokenMint: TOKEN_MINT,
            explorerBase: `https://explorer.solana.com/address/${TOKEN_MINT}?cluster=devnet`,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
    }
}

// POST — добавить своё событие в ленту
export async function POST(request: Request) {
    try {
        const { wallet, action, detail, txSignature } = await request.json();

        store.activityFeed.unshift({
            wallet,
            action,
            detail,
            timestamp: new Date().toISOString(),
            txSignature,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 });
    }
}
