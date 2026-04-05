// src/lib/dividends.ts
// Система автовыплат дивидендов держателям AGRO

import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const AGRO_MINT = process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT!;

// ═══════════════════════════════════════
//  КОНФИГУРАЦИЯ ДИВИДЕНДОВ
// ═══════════════════════════════════════

const DIVIDEND_CONFIG = {
    // Минимум SOL в пуле для выплаты
    minPoolBalanceSOL: 0.05,         // Devnet: 0.05 SOL (prod: 10 SOL)

    // Сколько держателей получают выплаты
    maxHolders: 100,

    // % от пула который распределяется
    distributionPercent: 80,        // 80% распределяем, 20% резерв

    // Tiers: множитель дивидендов по количеству токенов
    tiers: [
        { minTokens: 10000, multiplier: 2.0, label: '🏆 Whale' },
        { minTokens: 1000, multiplier: 1.5, label: '🥇 Gold' },
        { minTokens: 100, multiplier: 1.2, label: '🥈 Silver' },
        { minTokens: 1, multiplier: 1.0, label: '🥉 Bronze' },
    ],
};

// ═══════════════════════════════════════
//  ПОЛУЧИТЬ ВСЕХ ДЕРЖАТЕЛЕЙ ТОКЕНА
// ═══════════════════════════════════════

async function getTokenHolders(mintAddress: string): Promise<
    { wallet: string; balance: number; tier: string; multiplier: number }[]
> {
    const connection = new Connection(RPC_URL, 'confirmed');
    const mint = new PublicKey(mintAddress);

    // Получаем все токен-аккаунты для данного mint
    const accounts = await connection.getProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        {
            filters: [
                { dataSize: 165 },
                {
                    memcmp: {
                        offset: 0,
                        bytes: mint.toBase58(),
                    },
                },
            ],
        }
    );

    const holders = accounts
        .map((account) => {
            const data = account.account.data;
            // Парсим баланс (bytes 64-72, little-endian u64)
            const balance = Number(
                data.readBigUInt64LE(64)
            ) / Math.pow(10, 6); // decimals = 6

            // Парсим владельца (bytes 32-64)
            const owner = new PublicKey(data.slice(32, 64)).toBase58();

            if (balance <= 0) return null;

            // Определяем tier
            const tier = DIVIDEND_CONFIG.tiers.find(t => balance >= t.minTokens)
                || DIVIDEND_CONFIG.tiers[DIVIDEND_CONFIG.tiers.length - 1];

            return {
                wallet: owner,
                balance,
                tier: tier.label,
                multiplier: tier.multiplier,
            };
        })
        .filter((h): h is { wallet: string; balance: number; tier: string; multiplier: number } => h !== null)
        .sort((a, b) => b.balance - a.balance) // сортируем по балансу
        .slice(0, DIVIDEND_CONFIG.maxHolders);    // топ-100

    return holders;
}

// ═══════════════════════════════════════
//  РАССЧИТАТЬ ВЫПЛАТЫ
// ═══════════════════════════════════════

function calculatePayouts(
    holders: { wallet: string; balance: number; tier: string; multiplier: number }[],
    poolBalanceLamports: number
): { wallet: string; lamports: number; solAmount: number; share: string }[] {

    const distributionLamports = Math.floor(
        poolBalanceLamports * (DIVIDEND_CONFIG.distributionPercent / 100)
    );

    // Взвешенный total (с учётом multiplier)
    const totalWeighted = holders.reduce(
        (acc, h) => acc + h.balance * h.multiplier, 0
    );

    if (totalWeighted === 0) return [];

    return holders.map((holder) => {
        const weightedBalance = holder.balance * holder.multiplier;
        const share = weightedBalance / totalWeighted;
        const lamports = Math.floor(distributionLamports * share);

        return {
            wallet: holder.wallet,
            lamports,
            solAmount: lamports / 1e9,
            share: (share * 100).toFixed(4) + '%',
        };
    }).filter(p => p.lamports > 5000); // минимум 5000 lamports
}

// ═══════════════════════════════════════
//  ВЫПОЛНИТЬ ВЫПЛАТЫ
// ═══════════════════════════════════════

export async function distributeDividends(): Promise<{
    success: boolean;
    totalDistributed: number;
    holdersCount: number;
    payouts: any[];
    txSignatures: string[];
    message: string;
}> {
    try {
        const connection = new Connection(RPC_URL, 'confirmed');

        // Vault keypair (платёжный кошелёк)
        const vault = Keypair.fromSecretKey(
            bs58.decode(process.env.PRIVATE_KEY!)
        );

        // Проверяем баланс vault
        const vaultBalance = await connection.getBalance(vault.publicKey);
        const minBalance = DIVIDEND_CONFIG.minPoolBalanceSOL * 1e9;

        if (vaultBalance < minBalance) {
            return {
                success: false,
                totalDistributed: 0,
                holdersCount: 0,
                payouts: [],
                txSignatures: [],
                message: `Insufficient vault balance: ${(vaultBalance / 1e9).toFixed(4)} SOL. Need ${DIVIDEND_CONFIG.minPoolBalanceSOL} SOL`,
            };
        }

        // Получаем держателей
        const holders = await getTokenHolders(AGRO_MINT);
        if (holders.length === 0) {
            return {
                success: false,
                totalDistributed: 0,
                holdersCount: 0,
                payouts: [],
                txSignatures: [],
                message: 'No token holders found',
            };
        }

        // Рассчитываем выплаты
        const payouts = calculatePayouts(holders, vaultBalance);
        const txSignatures: string[] = [];
        let totalDistributed = 0;

        // Отправляем выплаты батчами по 5
        const BATCH_SIZE = 5;
        for (let i = 0; i < payouts.length; i += BATCH_SIZE) {
            const batch = payouts.slice(i, i + BATCH_SIZE);

            const tx = new Transaction();
            for (const payout of batch) {
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: vault.publicKey,
                        toPubkey: new PublicKey(payout.wallet),
                        lamports: payout.lamports,
                    })
                );
            }

            try {
                const sig = await sendAndConfirmTransaction(
                    connection, tx, [vault], { commitment: 'confirmed' }
                );
                txSignatures.push(sig);
                totalDistributed += batch.reduce((acc, p) => acc + p.lamports, 0);

                // Пауза между батчами
                await new Promise(r => setTimeout(r, 500));
            } catch (error) {
                console.error(`Batch ${i} failed:`, error);
            }
        }

        return {
            success: true,
            totalDistributed: totalDistributed / 1e9,
            holdersCount: holders.length,
            payouts,
            txSignatures,
            message: `✅ Distributed ${(totalDistributed / 1e9).toFixed(4)} SOL to ${holders.length} holders`,
        };
    } catch (error) {
        return {
            success: false,
            totalDistributed: 0,
            holdersCount: 0,
            payouts: [],
            txSignatures: [],
            message: `Error: ${(error as Error).message}`,
        };
    }
}

// ═══════════════════════════════════════
//  PREVIEW (без реальной выплаты)
// ═══════════════════════════════════════

export async function previewDividends(): Promise<{
    poolBalance: number;
    toDistribute: number;
    holdersCount: number;
    payouts: any[];
}> {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Vault address
    const vaultPubkey = new PublicKey('bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg');

    const vaultBalance = await connection.getBalance(vaultPubkey);
    const holders = await getTokenHolders(AGRO_MINT);
    const payouts = calculatePayouts(holders, vaultBalance);

    return {
        poolBalance: vaultBalance / 1e9,
        toDistribute: payouts.reduce((acc, p) => acc + p.solAmount, 0),
        holdersCount: holders.length,
        payouts,
    };
}
