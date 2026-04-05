// lib/bags-sdk.ts
// ═══════════════════════════════════════════════
//  BAGS SDK INITIALIZATION & SERVICE LAYER
// ═══════════════════════════════════════════════

import { Connection, PublicKey } from '@solana/web3.js';

// ═══════════════════════════════════════════════
//  TOKEN MINT ADDRESSES
// ═══════════════════════════════════════════════

export const TOKEN_MINTS = {
  AGRO: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT || '',
  oBBL: process.env.NEXT_PUBLIC_OBBL_TOKEN_MINT || '',
  oWHT: process.env.NEXT_PUBLIC_OWHT_TOKEN_MINT || '',
  oLNG: process.env.NEXT_PUBLIC_OLNG_TOKEN_MINT || '',
  oCRN: process.env.NEXT_PUBLIC_OCRN_TOKEN_MINT || '',
  oUREA: process.env.NEXT_PUBLIC_OUREA_TOKEN_MINT || '',
  oAMN: process.env.NEXT_PUBLIC_OAMN_TOKEN_MINT || '',
} as const;

// ═══════════════════════════════════════════════
//  SOLANA CONNECTION SINGLETON
// ═══════════════════════════════════════════════

let connectionInstance: Connection | null = null;

export function getConnection(): Connection {
  if (!connectionInstance) {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      'https://api.mainnet-beta.solana.com';
    connectionInstance = new Connection(rpcUrl, 'processed');
  }
  return connectionInstance;
}

// ═══════════════════════════════════════════════
//  BAGS API HELPER FUNCTIONS
// ═══════════════════════════════════════════════

const BAGS_API_BASE = 'https://public-api-v2.bags.fm/api/v1';

export async function bagsApiFetch(endpoint: string) {
  const apiKey =
    process.env.BAGS_API_KEY || process.env.NEXT_PUBLIC_BAGS_API_KEY;
  const res = await fetch(`${BAGS_API_BASE}${endpoint}`, {
    headers: { 'x-api-key': apiKey || '' },
  });
  if (!res.ok) throw new Error(`Bags API error: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════
//  LIFETIME FEES (Revenue tracking)
// ═══════════════════════════════════════════════

export async function getTokenLifetimeFees(tokenMint: string) {
  return bagsApiFetch(
    `/token-launch/lifetime-fees?tokenMint=${tokenMint}`
  );
}

// ═══════════════════════════════════════════════
//  TOKEN HOLDERS (for DAO voting weights)
// ═══════════════════════════════════════════════

export async function getTokenHolders(tokenMint: string) {
  return bagsApiFetch(`/token-launch/holders?tokenMint=${tokenMint}`);
}

// ═══════════════════════════════════════════════
//  CHECK USER TOKEN BALANCE (Access Gate)
// ═══════════════════════════════════════════════

export async function checkTokenBalance(
  walletAddress: string,
  tokenMint: string
): Promise<{ hasAccess: boolean; balance: number }> {
  try {
    const connection = getConnection();
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMint);

    const tokenAccounts =
      await connection.getParsedTokenAccountsByOwner(wallet, { mint });

    let balance = 0;
    for (const account of tokenAccounts.value) {
      balance +=
        account.account.data.parsed.info.tokenAmount.uiAmount || 0;
    }

    return { hasAccess: balance > 0, balance };
  } catch (error) {
    console.error('Error checking token balance:', error);
    return { hasAccess: false, balance: 0 };
  }
}
