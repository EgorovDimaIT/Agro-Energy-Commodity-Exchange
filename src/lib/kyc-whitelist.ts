// src/lib/kyc-whitelist.ts
// Система верификации адресов (реальная проверка on-chain активности)

// ════════════════════════════════════════════
//  KYC УРОВНИ
// ════════════════════════════════════════════

export type KYCLevel = 'none' | 'basic' | 'institutional' | 'blocked';

export interface KYCStatus {
    address: string;
    level: KYCLevel;
    verifiedAt?: string;
    expiresAt?: string;
    country?: string;
    entity?: string;      // Название компании
    restrictions: string[];
    canTrade: boolean;
    maxTradeUSD: number;
    amlScore: number;     // 0-100, чем выше = хуже
}

// ════════════════════════════════════════════
//  WHITELIST (в prod это будет в БД)
// ════════════════════════════════════════════

// Жёсткий whitelist — только одобренные адреса
const APPROVED_WHITELIST: Record<string, Omit<KYCStatus, 'address'>> = {
    // Добавьте сюда свои тестовые кошельки
    'bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg': {
        level: 'institutional',
        verifiedAt: '2026-01-15T00:00:00Z',
        expiresAt: '2027-01-15T00:00:00Z',
        country: 'UA',
        entity: 'Agro-Energy Exchange Team',
        restrictions: [],
        canTrade: true,
        maxTradeUSD: 10_000_000,
        amlScore: 5,
    },
};

// OFAC SDN List (упрощённая) — заблокированные адреса
const BLOCKED_ADDRESSES = new Set([
    // Добавляй известные скам-адреса сюда
    '1nc1nerator11111111111111111111111111111111',
]);

// ════════════════════════════════════════════
//  ПРОВЕРКА ON-CHAIN АКТИВНОСТИ
// ════════════════════════════════════════════

async function checkOnChainActivity(
    address: string,
    rpcUrl: string
): Promise<{
    isActive: boolean;
    txCount: number;
    accountAge: number; // дней
    hasTokenActivity: boolean;
}> {
    try {
        const { Connection, PublicKey } = await import('@solana/web3.js');
        const connection = new Connection(rpcUrl, 'confirmed');
        const pubkey = new PublicKey(address);

        // Получаем последние транзакции
        const signatures = await connection.getSignaturesForAddress(pubkey, {
            limit: 20,
        });

        const txCount = signatures.length;
        const isActive = txCount > 0;

        // Возраст аккаунта
        let accountAge = 0;
        if (signatures.length > 0) {
            const oldest = signatures[signatures.length - 1];
            if (oldest.blockTime) {
                accountAge = Math.floor(
                    (Date.now() / 1000 - oldest.blockTime) / 86400
                );
            }
        }

        // Проверяем наличие токен-аккаунтов
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            pubkey,
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );
        const hasTokenActivity = tokenAccounts.value.length > 0;

        return { isActive, txCount, accountAge, hasTokenActivity };
    } catch {
        return { isActive: false, txCount: 0, accountAge: 0, hasTokenActivity: false };
    }
}

// ════════════════════════════════════════════
//  ГЛАВНАЯ ФУНКЦИЯ ПРОВЕРКИ
// ════════════════════════════════════════════

export async function verifyAddress(
    address: string,
    rpcUrl: string
): Promise<KYCStatus> {

    // 1. Проверяем заблокированные адреса (OFAC)
    if (BLOCKED_ADDRESSES.has(address)) {
        return {
            address,
            level: 'blocked',
            restrictions: ['OFAC_SDN_LIST', 'AML_HIGH_RISK'],
            canTrade: false,
            maxTradeUSD: 0,
            amlScore: 100,
        };
    }

    // 2. Проверяем жёсткий whitelist
    const whitelisted = APPROVED_WHITELIST[address];
    if (whitelisted) {
        return { address, ...whitelisted };
    }

    // 3. Анализируем on-chain активность
    const onChain = await checkOnChainActivity(address, rpcUrl);

    // 4. Присваиваем уровень на основе активности
    let level: KYCLevel = 'none';
    let maxTradeUSD = 0;
    const restrictions: string[] = [];
    let amlScore = 50; // нейтральный

    if (onChain.isActive && onChain.txCount >= 5) {
        level = 'basic';
        maxTradeUSD = 10_000; // $10K лимит для basic
        amlScore = 30;
    }

    if (onChain.isActive && onChain.txCount >= 20 && onChain.accountAge >= 30) {
        level = 'basic'; // Нужна реальная KYC верификация для institutional
        maxTradeUSD = 50_000;
        amlScore = 20;
        restrictions.push('PENDING_INSTITUTIONAL_KYC');
    }

    if (onChain.txCount === 0) {
        restrictions.push('NEW_WALLET_MONITORING');
        amlScore = 60;
    }

    return {
        address,
        level,
        verifiedAt: new Date().toISOString(),
        restrictions,
        canTrade: level !== 'none' && level !== 'blocked',
        maxTradeUSD,
        amlScore,
    };
}

// Добавить адрес в whitelist (для тестирования)
export function addToWhitelist(
    address: string,
    entity: string,
    country: string
) {
    APPROVED_WHITELIST[address] = {
        level: 'institutional',
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        country,
        entity,
        restrictions: [],
        canTrade: true,
        maxTradeUSD: 10_000_000,
        amlScore: 10,
    };
}
