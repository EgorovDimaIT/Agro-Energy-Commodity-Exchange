// scripts/launch_bags_mainnet.ts
// Используем твой существующий скрипт launch_token.ts как основу
// ТОЛЬКО после завершения тестирования на Devnet!

const { BagsSDK } = require('@bagsfm/bags-sdk');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MAINNET_RPC = process.env.SOLANA_RPC_URL!;
const API_KEY = process.env.BAGS_API_KEY!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

// Fee sharing конфигурация
// Ты получаешь 100% комиссий изначально
// Потом можешь добавить соинвесторов
const FEE_CLAIMERS = [
    {
        wallet: 'bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg', // Ваш кошелек
        shareBps: 7000, // 70%
    },
    {
        wallet: 'bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg', // Treasury (пока тот же для демо)
        shareBps: 2000, // 20%
    },
    {
        wallet: 'bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg', // Community (пока тот же для демо)
        shareBps: 1000, // 10%
    },
];

async function launchOnBagsMainnet(tokenConfig: {
    name: string;
    symbol: string;
    description: string;
    imageUrl: string;
    twitter?: string;
    website?: string;
    telegram?: string;
    initialBuySOL: number;
}) {
    const connection = new Connection(MAINNET_RPC, 'confirmed');
    const sdk = new BagsSDK(API_KEY, connection, 'confirmed');
    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

    console.log(`🚀 Launching ${tokenConfig.symbol} on Bags Mainnet...`);

    // Создаём метаданные токена
    const tokenInfo = await sdk.tokenLaunch.createTokenInfoAndMetadata({
        name: tokenConfig.name,
        symbol: tokenConfig.symbol,
        description: tokenConfig.description,
        imageUrl: tokenConfig.imageUrl,
        twitter: tokenConfig.twitter,
        website: tokenConfig.website,
        telegram: tokenConfig.telegram,
    });

    console.log(`✅ Token Mint: ${tokenInfo.tokenMint}`);
    console.log(`📄 Metadata: ${tokenInfo.tokenMetadata}`);

    // Создаём конфиг fee sharing
    const configResult = await sdk.config.createBagsFeeShareConfig({
        payer: keypair.publicKey,
        baseMint: new PublicKey(tokenInfo.tokenMint),
        feeClaimers: FEE_CLAIMERS.map(fc => ({
            user: new PublicKey(fc.wallet),
            userBps: fc.shareBps,
        }))
    });

    const configKey = configResult.meteoraConfigKey;
    console.log(`✅ Config Key: ${configKey.toBase58()}`);

    // Запускаем токен
    const tx = await sdk.tokenLaunch.createLaunchTransaction({
        metadataUrl: tokenInfo.tokenMetadata,
        tokenMint: new PublicKey(tokenInfo.tokenMint),
        launchWallet: keypair.publicKey,
        initialBuyLamports: tokenConfig.initialBuySOL * 1e9,
        configKey,
    });

    const signature = await sdk.solana.signAndSendTransaction(tx, keypair);

    console.log(`✅ Launched! Signature: ${signature}`);
    console.log(`🌐 View: https://bags.fm/${tokenInfo.tokenMint}`);

    return { signature, tokenMint: tokenInfo.tokenMint };
}

// ПРИМЕР ЗАПУСКА (НЕ ЗАПУСКАТЬ БЕЗ КОМАНДЫ ПОЛЬЗОВАТЕЛЯ)
/*
launchOnBagsMainnet({
  name: "Agro-Energy Governance",
  symbol: "AGRO",
  description: "Governance token for Agro-Energy RWA Social Exchange",
  imageUrl: "https://your-image-url.png",
  initialBuySOL: 0.1
}).catch(console.error);
*/
