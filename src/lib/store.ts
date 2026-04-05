// src/lib/store.ts
// ════════════════════════════════════════════
// IN-MEMORY STORE — замена БД для Devnet/хакатона
// ════════════════════════════════════════════

export interface Milestone {
    id: number;
    title: string;
    description: string;
    amount: number;        // в lamports (SOL * 1e9)
    amountSOL: number;     // читаемый формат
    status: 'locked' | 'oracle_confirmed' | 'voting' | 'released' | 'rejected';
    oracleConfirmedAt?: string;
    votingDeadline?: string;
    yesVotes: number;
    noVotes: number;
    voters: Record<string, 'yes' | 'no'>;  // wallet -> vote
    releaseTxSignature?: string;
}

export interface Project {
    id: string;
    name: string;
    tokenMint: string;
    supplier: string;      // wallet address
    targetSOL: number;
    raisedSOL: number;
    milestones: Milestone[];
    investors: Record<string, number>; // wallet -> SOL amount
    createdAt: string;
}

// ════════════════════════════════════════════
// НАЧАЛЬНЫЕ ДАННЫЕ — ваши реальные токены Devnet
// ════════════════════════════════════════════

export const store = {
    projects: [
        {
            id: 'owht-oc26',
            name: 'Odesa-Cairo Wheat Corridor Q3 2026',
            tokenMint: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT || 'BZBvHcjsZJVKwLJSesCSe3CyVJubXWAsz7Yo6VQ2bSA1', // ваш Devnet токен
            supplier: 'bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg', // Vault address
            targetSOL: 5.0,
            raisedSOL: 3.2,
            milestones: [
                {
                    id: 1,
                    title: 'Contract Signing & Insurance',
                    description: 'Execution of forward contract and cargo insurance',
                    amount: 450000000,  // 0.45 SOL в lamports
                    amountSOL: 0.45,
                    status: 'released' as const,
                    yesVotes: 3,
                    noVotes: 0,
                    voters: {},
                    releaseTxSignature: 'demo_tx_1',
                },
                {
                    id: 2,
                    title: 'Warehouse Verification & Audit',
                    description: 'Physical audit of grain in Odesa silos',
                    amount: 900000000,  // 0.9 SOL в lamports
                    amountSOL: 0.9,
                    status: 'released' as const,
                    yesVotes: 4,
                    noVotes: 1,
                    voters: {},
                    releaseTxSignature: 'demo_tx_2',
                },
                {
                    id: 3,
                    title: 'Loading & Ship Departure',
                    description: 'Vessel loaded, Bill of Lading issued, AIS departure confirmed',
                    amount: 1350000000, // 1.35 SOL в lamports
                    amountSOL: 1.35,
                    status: 'locked' as const,
                    yesVotes: 0,
                    noVotes: 0,
                    voters: {},
                },
                {
                    id: 4,
                    title: 'In-Transit Oracle Confirmation',
                    description: 'AIS tracking confirms vessel en route',
                    amount: 900000000,
                    amountSOL: 0.9,
                    status: 'locked' as const,
                    yesVotes: 0,
                    noVotes: 0,
                    voters: {},
                },
                {
                    id: 5,
                    title: 'Final Delivery & Settlement',
                    description: 'Cargo discharged at Alexandria port',
                    amount: 900000000,
                    amountSOL: 0.9,
                    status: 'locked' as const,
                    yesVotes: 0,
                    noVotes: 0,
                    voters: {},
                },
            ],
            investors: {},
            createdAt: new Date().toISOString(),
        },
    ] as Project[],

    // Лента активности
    activityFeed: [] as {
        wallet: string;
        action: string;
        detail: string;
        timestamp: string;
        txSignature?: string;
    }[],
};

// ════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════

export function getProject(id: string): Project | undefined {
    return store.projects.find(p => p.id === id);
}

export function getMilestone(
    projectId: string,
    milestoneId: number
): Milestone | undefined {
    return getProject(projectId)?.milestones.find(m => m.id === milestoneId);
}

export function addActivity(
    wallet: string,
    action: string,
    detail: string,
    txSignature?: string
) {
    store.activityFeed.unshift({
        wallet,
        action,
        detail,
        timestamp: new Date().toISOString(),
        txSignature,
    });

    // Храним максимум 50 записей
    if (store.activityFeed.length > 50) {
        store.activityFeed.pop();
    }
}

// ════════════════════════════════════════════
//  ПОЛНАЯ СПЕЦИФИКАЦИЯ ТОВАРНЫХ ТОКЕНОВ
// ════════════════════════════════════════════

export const COMMODITY_TOKENS = {
    oBBL: {
        symbol: 'oBBL',
        name: 'Tokenized Brent Crude Oil',
        mint: process.env.NEXT_PUBLIC_OBBL_TOKEN_MINT || '',
        emoji: '🛢️',
        commodity: 'Brent Crude Oil',
        unit: 'BBL',
        supply: 800_000,
        decimals: 6,
        priceUSD: 82.40,
        totalValueUSD: 65_920_000,
        location: {
            port: 'Port of Rotterdam',
            country: 'Netherlands',
            locode: 'NLRTM',
            lat: 51.9225,
            lng: 4.4792,
        },
        custody: {
            operator: 'Vopak Terminal Rotterdam',
            certification: 'ISO 28000:2007',
            inspectedBy: 'SGS Group',
            lastAudit: '2026-01-15',
            warehouseId: 'VTR-2026-0441',
        },
        oracle: {
            priceFeed: 'Brent Crude ICE Futures',
            logisticsFeed: 'aisstream.io (Rotterdam bbox)',
        },
        bags: {
            tokenUrl: '',    // заполнится после запуска
            projectUrl: '',
        },
        description: 'Physical Brent Crude Oil stored at Vopak Terminal Rotterdam. Each token represents 1 barrel. Backed 1:1 by audited reserves.',
        stats: {
            holders: 0,
            volume24h: 0,
            priceChange24h: 0,
        },
    },

    oLNG: {
        symbol: 'oLNG',
        name: 'Tokenized Liquefied Natural Gas',
        mint: process.env.NEXT_PUBLIC_OLNG_TOKEN_MINT || '',
        emoji: '⚡',
        commodity: 'Liquefied Natural Gas',
        unit: 'MMBtu',
        supply: 600_000,
        decimals: 6,
        priceUSD: 3.21,
        totalValueUSD: 1_926_000,
        location: {
            port: 'Port of Houston (LNG Terminal)',
            country: 'USA',
            locode: 'USHOU',
            lat: 29.7604,
            lng: -95.3698,
        },
        custody: {
            operator: 'Cheniere Energy',
            certification: 'FERC Regulated',
            inspectedBy: 'Bureau Veritas',
            lastAudit: '2026-01-20',
            warehouseId: 'CHN-LNG-2026-0089',
        },
        oracle: {
            priceFeed: 'Henry Hub Natural Gas NYMEX',
            logisticsFeed: 'aisstream.io (Houston bbox)',
        },
        bags: { tokenUrl: '', projectUrl: '' },
        description: 'LNG stored at Cheniere Sabine Pass terminal, Houston. Each token represents 1 MMBtu of natural gas.',
        stats: { holders: 0, volume24h: 0, priceChange24h: 0 },
    },

    oWHT: {
        symbol: 'oWHT',
        name: 'Tokenized Wheat Grade 1',
        mint: process.env.NEXT_PUBLIC_OWHT_TOKEN_MINT || '',
        emoji: '🌾',
        commodity: 'Wheat Grade 1 (GAFTA)',
        unit: 'MT',
        supply: 550_000,
        decimals: 6,
        priceUSD: 185,           // per MT
        totalValueUSD: 101_750_000,
        location: {
            port: 'Port of Odesa',
            country: 'Ukraine',
            locode: 'UAODS',
            lat: 46.4825,
            lng: 30.7233,
        },
        custody: {
            operator: 'MV Cargo LLC',
            certification: 'GAFTA 125 certified',
            inspectedBy: 'Intertek Group',
            lastAudit: '2026-02-01',
            warehouseId: 'MVC-ODS-2026-0217',
        },
        oracle: {
            priceFeed: 'CBOT Wheat Futures (W)',
            logisticsFeed: 'aisstream.io (Odesa bbox)',
        },
        bags: { tokenUrl: '', projectUrl: '' },
        description: 'Ukrainian Wheat Grade 1 stored in GAFTA-certified Odesa grain elevator. Each token = 1 MT.',
        stats: { holders: 0, volume24h: 0, priceChange24h: 0 },
    },

    oCRN: {
        symbol: 'oCRN',
        name: 'Tokenized Corn Grade 1',
        mint: process.env.NEXT_PUBLIC_OCRN_TOKEN_MINT || '',
        emoji: '🌽',
        commodity: 'Yellow Corn Grade 1 (USDA)',
        unit: 'MT',
        supply: 720_000,
        decimals: 6,
        priceUSD: 165,
        totalValueUSD: 118_800_000,
        location: {
            port: 'Port of Houston (Grain Terminal)',
            country: 'USA',
            locode: 'USHOU',
            lat: 29.7604,
            lng: -95.3698,
        },
        custody: {
            operator: 'Bunge North America',
            certification: 'USDA Grain Inspection',
            inspectedBy: 'FGIS (Federal Grain Inspection Service)',
            lastAudit: '2026-01-28',
            warehouseId: 'BNG-HOU-2026-0334',
        },
        oracle: {
            priceFeed: 'CBOT Corn Futures (C)',
            logisticsFeed: 'aisstream.io (Houston bbox)',
        },
        bags: { tokenUrl: '', projectUrl: '' },
        description: 'USDA-inspected Yellow Corn Grade 1 at Bunge Houston grain terminal. Each token = 1 MT.',
        stats: { holders: 0, volume24h: 0, priceChange24h: 0 },
    },

    oUREA: {
        symbol: 'oUREA',
        name: 'Tokenized Urea Fertilizer',
        mint: process.env.NEXT_PUBLIC_OUREA_TOKEN_MINT || '',
        emoji: '🧪',
        commodity: 'Prilled Urea 46-0-0',
        unit: 'MT',
        supply: 400_000,
        decimals: 6,
        priceUSD: 290,
        totalValueUSD: 116_000_000,
        location: {
            port: 'Jebel Ali Port',
            country: 'UAE',
            locode: 'AEJEA',
            lat: 25.0118,
            lng: 55.0694,
        },
        custody: {
            operator: 'DP World Jebel Ali',
            certification: 'ISO 9001:2015',
            inspectedBy: 'SGS Gulf Limited',
            lastAudit: '2026-02-05',
            warehouseId: 'DPW-JEA-2026-0156',
        },
        oracle: {
            priceFeed: 'Middle East Granular Urea (Fertecon)',
            logisticsFeed: 'aisstream.io (Jebel Ali bbox)',
        },
        bags: { tokenUrl: '', projectUrl: '' },
        description: 'Prilled Urea (46-0-0) stored at DP World Jebel Ali. Each token = 1 MT.',
        stats: { holders: 0, volume24h: 0, priceChange24h: 0 },
    },

    oAMN: {
        symbol: 'oAMN',
        name: 'Tokenized Ammonium Nitrate',
        mint: process.env.NEXT_PUBLIC_OAMN_TOKEN_MINT || '',
        emoji: '💎',
        commodity: 'Ammonium Nitrate 34.5-0-0',
        unit: 'MT',
        supply: 350_000,
        decimals: 6,
        priceUSD: 320,
        totalValueUSD: 112_000_000,
        location: {
            port: 'Port of Antwerp',
            country: 'Belgium',
            locode: 'BEANR',
            lat: 51.2194,
            lng: 4.4025,
        },
        custody: {
            operator: 'Katoen Natie',
            certification: 'REACH/CLP EU Compliant, ADR Class 5.1',
            inspectedBy: 'Bureau Veritas Belgium',
            lastAudit: '2026-01-25',
            warehouseId: 'KTN-ANR-2026-0098',
        },
        oracle: {
            priceFeed: 'European AN Price Index (ICIS)',
            logisticsFeed: 'aisstream.io (Antwerp bbox)',
        },
        bags: { tokenUrl: '', projectUrl: '' },
        description: 'AN 34.5% stored at Katoen Natie Antwerp in REACH-compliant facility. Each token = 1 MT.',
        stats: { holders: 0, volume24h: 0, priceChange24h: 0 },
    },
} as const;


export type TokenSymbol = keyof typeof COMMODITY_TOKENS;

// ════════════════════════════════════════════
//  ACCESS TIERS & TOKENOMICS
// ════════════════════════════════════════════

export const ACCESS_TIERS = [
    { id: 'bronze', name: '🥉 Bronze', minAGRO: 1, privileges: ['Market View'], color: '#cd7f32' },
    { id: 'silver', name: '🥈 Silver', minAGRO: 100, privileges: ['Trading oWHT, oCRN'], color: '#c0c0c0' },
    { id: 'gold', name: '🥇 Gold', minAGRO: 1000, privileges: ['All Assets', 'Escrow up to $50K'], color: '#ffd700' },
    { id: 'whale', name: '🏆 Whale', minAGRO: 10000, privileges: ['VIP Status', 'No Escrow Limit'], color: '#00d4aa' },
];

export const AGRO_TOKENOMICS = {
    totalSupply: 1_000_000,
    distribution: [
        { label: '🌊 Public Sale', amount: 300_000, percentage: 30 },
        { label: '💧 Liquidity', amount: 200_000, percentage: 20 },
        { label: '🏆 Community', amount: 200_000, percentage: 20 },
        { label: '👥 Team', amount: 150_000, percentage: 15 },
        { label: '🌾 Treasury', amount: 100_000, percentage: 10 },
        { label: '🤝 Partners', amount: 50_000, percentage: 5 },
    ],
    feeBps: 100, // 1%
    burnBps: 200, // 2% on escrow transactions
};
