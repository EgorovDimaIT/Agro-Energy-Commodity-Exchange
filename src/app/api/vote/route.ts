// src/app/api/vote/route.ts
import { NextResponse } from 'next/server';
import {
    Connection,
    PublicKey,
} from '@solana/web3.js';
import { getProject, getMilestone, addActivity } from '@/lib/store';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const TOKEN_MINT = process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT!;

// ── Проверяем баланс токена у пользователя ──
async function getTokenBalance(walletAddress: string): Promise<number> {
    try {
        const connection = new Connection(RPC_URL, 'confirmed');
        const wallet = new PublicKey(walletAddress);
        const mint = new PublicKey(TOKEN_MINT);

        const accounts = await connection.getParsedTokenAccountsByOwner(wallet, {
            mint,
        });

        let balance = 0;
        for (const acc of accounts.value) {
            balance += acc.account.data.parsed.info.tokenAmount.uiAmount || 0;
        }
        return balance;
    } catch (error) {
        console.error('Token balance check failed:', error);
        return 0;
    }
}

export async function POST(request: Request) {
    try {
        const { projectId, milestoneId, walletAddress, vote } = await request.json();

        // ── Валидация ──
        if (!projectId || !milestoneId || !walletAddress || !vote) {
            return NextResponse.json(
                { error: 'Missing required fields: projectId, milestoneId, walletAddress, vote' },
                { status: 400 }
            );
        }

        if (!['yes', 'no'].includes(vote)) {
            return NextResponse.json(
                { error: 'Vote must be "yes" or "no"' },
                { status: 400 }
            );
        }

        const project = getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const milestone = getMilestone(projectId, milestoneId);
        if (!milestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        // ── Проверяем статус голосования ──
        if (milestone.status !== 'voting') {
            return NextResponse.json(
                { error: `Cannot vote: milestone status is "${milestone.status}"` },
                { status: 400 }
            );
        }

        // ── Проверяем дедлайн ──
        if (milestone.votingDeadline) {
            const deadline = new Date(milestone.votingDeadline);
            if (new Date() > deadline) {
                return NextResponse.json(
                    { error: 'Voting period has ended' },
                    { status: 400 }
                );
            }
        }

        // ── Проверяем повторное голосование ──
        if (milestone.voters[walletAddress]) {
            return NextResponse.json(
                { error: 'You have already voted on this milestone' },
                { status: 400 }
            );
        }

        // ── Получаем вес голоса (баланс токена) ──
        const tokenBalance = await getTokenBalance(walletAddress);

        if (tokenBalance === 0) {
            return NextResponse.json(
                {
                    error: 'You need $AGRO tokens to vote (Devnet). Get them with: solana airdrop 1',
                    tokenBalance: 0,
                },
                { status: 403 }
            );
        }

        // ── Записываем голос ──
        milestone.voters[walletAddress] = vote;
        const voteWeight = Math.max(1, Math.floor(tokenBalance)); // минимум 1 голос

        if (vote === 'yes') {
            milestone.yesVotes += voteWeight;
        } else {
            milestone.noVotes += voteWeight;
        }

        // ── Добавляем в ленту активности ──
        const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        addActivity(
            walletAddress,
            vote === 'yes' ? '✅ Voted YES' : '❌ Voted NO',
            `Milestone #${milestoneId}: "${milestone.title}" | Weight: ${voteWeight} $AGRO`
        );

        // ── Проверяем кворум (51%) ──
        const totalVotes = milestone.yesVotes + milestone.noVotes;
        const yesPercent = (milestone.yesVotes / totalVotes) * 100;
        const quorumReached = totalVotes >= 3; // для демо: минимум 3 голоса

        return NextResponse.json({
            success: true,
            message: `Vote recorded! You voted ${vote.toUpperCase()} with weight ${voteWeight}`,
            milestone: {
                id: milestone.id,
                yesVotes: milestone.yesVotes,
                noVotes: milestone.noVotes,
                yesPercent: yesPercent.toFixed(1),
                quorumReached,
                totalVotes,
                canRelease: quorumReached && yesPercent > 51,
            },
            voter: {
                wallet: walletAddress,
                tokenBalance,
                voteWeight,
                vote,
            },
        });
    } catch (error) {
        console.error('Vote API error:', error);
        return NextResponse.json({ error: 'Voting failed' }, { status: 500 });
    }
}

// GET — получить результаты голосования
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const milestoneId = Number(searchParams.get('milestoneId'));

    if (!projectId || !milestoneId) {
        return NextResponse.json({ error: 'projectId and milestoneId required' }, { status: 400 });
    }

    const milestone = getMilestone(projectId, milestoneId);
    if (!milestone) {
        return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const totalVotes = milestone.yesVotes + milestone.noVotes;
    const yesPercent = totalVotes > 0
        ? (milestone.yesVotes / totalVotes) * 100
        : 0;

    return NextResponse.json({
        milestoneId,
        status: milestone.status,
        yesVotes: milestone.yesVotes,
        noVotes: milestone.noVotes,
        totalVotes,
        yesPercent: yesPercent.toFixed(1),
        votingDeadline: milestone.votingDeadline,
        quorumReached: totalVotes >= 3,
        canRelease: totalVotes >= 3 && yesPercent > 51,
        voterCount: Object.keys(milestone.voters).length,
    });
}
