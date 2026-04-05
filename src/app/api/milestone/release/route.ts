// src/app/api/milestone/release/route.ts
import { NextResponse } from 'next/server';
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { getProject, getMilestone, addActivity } from '@/lib/store';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;

// ── Серверный кошелёк (Vault) ──
function getVaultKeypair(): Keypair {
    const privateKeyBase58 = process.env.PRIVATE_KEY!;
    const secretKey = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(secretKey);
}

export async function POST(request: Request) {
    try {
        const { projectId, milestoneId } = await request.json();

        const project = getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const milestone = getMilestone(projectId, milestoneId);
        if (!milestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        // ── Проверки ──
        if (milestone.status !== 'voting') {
            return NextResponse.json(
                { error: `Cannot release: milestone status is "${milestone.status}"` },
                { status: 400 }
            );
        }

        const totalVotes = milestone.yesVotes + milestone.noVotes;
        const yesPercent = totalVotes > 0
            ? (milestone.yesVotes / totalVotes) * 100
            : 0;
        const quorumReached = totalVotes >= 3; // для демо: 3 голоса

        if (!quorumReached) {
            return NextResponse.json(
                {
                    error: `Quorum not reached. Need 3 votes, have ${totalVotes}`,
                    currentVotes: totalVotes,
                    needed: 3,
                },
                { status: 400 }
            );
        }

        if (yesPercent <= 51) {
            return NextResponse.json(
                {
                    error: `Vote rejected. Need >51% YES, have ${yesPercent.toFixed(1)}%`,
                    yesPercent,
                },
                { status: 400 }
            );
        }

        // ── Devnet SOL Transfer ──
        const connection = new Connection(RPC_URL, 'confirmed');
        const vaultKeypair = getVaultKeypair();

        // Проверяем баланс Vault
        const vaultBalance = await connection.getBalance(vaultKeypair.publicKey);
        const requiredLamports = milestone.amount;

        if (vaultBalance < requiredLamports + 5000) { // 5000 на комиссию
            return NextResponse.json(
                {
                    error: 'Insufficient funds in vault',
                    vaultBalance: vaultBalance / 1e9,
                    required: milestone.amountSOL,
                    message: 'Run: solana airdrop 2 <VAULT_ADDRESS> --url devnet',
                },
                { status: 400 }
            );
        }

        // Создаём транзакцию перевода SOL
        const supplierPublicKey = new PublicKey(project.supplier);
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: vaultKeypair.publicKey,
                toPubkey: supplierPublicKey,
                lamports: requiredLamports,
            })
        );

        // Отправляем и подтверждаем транзакцию
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [vaultKeypair],
            { commitment: 'confirmed' }
        );

        // ── Обновляем состояние ──
        milestone.status = 'released';
        milestone.releaseTxSignature = signature;

        // Добавляем в ленту активности
        addActivity(
            vaultKeypair.publicKey.toBase58(),
            '💰 Funds Released',
            `Milestone #${milestoneId}: "${milestone.title}" — ${milestone.amountSOL} SOL released`,
            signature
        );

        return NextResponse.json({
            success: true,
            message: `Funds released! ${milestone.amountSOL} SOL sent to supplier`,
            transaction: {
                signature,
                explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
                amountSOL: milestone.amountSOL,
                from: vaultKeypair.publicKey.toBase58(),
                to: project.supplier,
            },
            milestone: {
                id: milestone.id,
                status: 'released',
                title: milestone.title,
                yesPercent: yesPercent.toFixed(1),
                totalVotes,
            },
        });
    } catch (error) {
        console.error('Release API error:', error);
        return NextResponse.json(
            { error: `Failed to release funds: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}
