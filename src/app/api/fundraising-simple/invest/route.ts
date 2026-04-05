// app/api/fundraising-simple/invest/route.ts
import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
const { readDB, writeDB } = require('../../../../lib/fundraising-db');

const DEVNET_RPC = 'https://api.devnet.solana.com';
const ESCROW_PUBKEY = "FJwqsC4y6dT6yLy4XQZEaAjzDEWbXkiJxJi6BfGS5naf";

export async function POST(request: Request) {
    try {
        const { projectId, investorPublicKey, amountSOL } = await request.json();
        const connection = new Connection(DEVNET_RPC, 'confirmed');

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(investorPublicKey),
                toPubkey: new PublicKey(ESCROW_PUBKEY),
                lamports: amountSOL * LAMPORTS_PER_SOL,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(investorPublicKey);

        return NextResponse.json({
            success: true,
            transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const { projectId, investorPublicKey, amountSOL, txSignature } = await request.json();
    const db = readDB();
    const project = db.projects.find((p: any) => p.id === projectId);
    if (project) {
        project.investors.push({ wallet: investorPublicKey, amountSOL, signature: txSignature });
        project.raisedSOL += amountSOL;
        writeDB(db);
    }
    return NextResponse.json({ success: true });
}
