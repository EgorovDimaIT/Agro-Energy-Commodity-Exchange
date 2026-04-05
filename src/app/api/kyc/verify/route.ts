// app/api/kyc/verify/route.ts
import { NextResponse } from 'next/server';
import { verifyAddress } from '@/lib/kyc-whitelist';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;

export async function POST(request: Request) {
    try {
        const { address } = await request.json();

        if (!address) {
            return NextResponse.json({ error: 'address required' }, { status: 400 });
        }

        const status = await verifyAddress(address, RPC_URL);

        return NextResponse.json({
            success: true,
            kyc: status,
            message: status.canTrade
                ? `✅ Access granted: ${status.level} level`
                : `❌ Access denied: ${status.restrictions.join(', ')}`,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'KYC verification failed' },
            { status: 500 }
        );
    }
}
