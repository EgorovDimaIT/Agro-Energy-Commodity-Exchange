// scripts/launch_bags_fundraising.js
// ═══════════════════════════════════════════════════════════════
//  LAUNCH AGRO CROWDFUNDING TOKEN ON BAGS.FM (MAINNET)
//  
//  This launches a real token on Bags.fm bonding curve.
//  Anyone buying the token = investing in the project.
//  Fee sharing distributes trading fees to the team.
// ═══════════════════════════════════════════════════════════════

const { BagsSDK } = require('@bagsfm/bags-sdk');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ─── CONFIG ───────────────────────────────────────────
const API_KEY = process.env.BAGS_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Use mainnet for real Bags.fm launch
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// Fee sharing: creator gets 100% of trading fees
const CREATOR_WALLET = 'bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg';

const FEE_CLAIMERS = [
    {
        user: new PublicKey(CREATOR_WALLET),
        userBps: 10000, // 100% to creator
    },
];

// ─── TOKEN CONFIG ─────────────────────────────────────
const TOKEN_CONFIG = {
    name: 'Agro-Energy RWA Fund',
    symbol: 'AGRO',
    description: `🌾 Agro-Energy RWA Crowdfunding Token

Invest in real-world agricultural commodity corridors. $AGRO powers the first tokenized wheat & energy trading platform on Solana.

📦 What you're funding:
• Odesa → Cairo wheat shipping corridor (Q3 2026)
• Tokenized commodity RWA infrastructure  
• Milestone-based DAO governance
• Oracle-verified logistics tracking

💰 Token Utility:
• Governance voting on milestone releases
• Revenue share from commodity trading fees
• Access to institutional RWA marketplace
• Tiered access (Bronze → Whale) based on holdings

🏗️ Built at StableHacks 2026
🔗 Platform: agro-exchange.vercel.app`,
    imageUrl: 'https://raw.githubusercontent.com/EgorovDimaIT/Agro-Energy-Commodity-Exchange/main/public/agro-logo.png',
    twitter: 'https://twitter.com/AgroEnergyRWA',
    website: 'https://agro-exchange.vercel.app',
    initialBuySOL: 0.01, // Minimum initial buy
};

async function launchOnBags() {
    console.log('═══════════════════════════════════════════════');
    console.log('  🚀 LAUNCHING AGRO TOKEN ON BAGS.FM (MAINNET)');
    console.log('═══════════════════════════════════════════════');

    if (!API_KEY || !PRIVATE_KEY) {
        console.error('❌ Missing BAGS_API_KEY or PRIVATE_KEY in .env.local');
        process.exit(1);
    }

    const connection = new Connection(MAINNET_RPC, 'confirmed');
    const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

    console.log(`📍 Wallet: ${keypair.publicKey.toBase58()}`);

    // Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSOL = balance / 1e9;
    console.log(`💰 Balance: ${balanceSOL} SOL`);

    if (balanceSOL < 0.05) {
        console.error(`❌ Need at least 0.05 SOL on mainnet. Current: ${balanceSOL} SOL`);
        console.log('   Send SOL to:', keypair.publicKey.toBase58());
        process.exit(1);
    }

    const sdk = new BagsSDK(API_KEY, connection, 'confirmed');

    // Step 1: Create token info & metadata on IPFS
    console.log('\n📋 Step 1: Creating token metadata on IPFS...');
    const tokenInfo = await sdk.tokenLaunch.createTokenInfoAndMetadata({
        name: TOKEN_CONFIG.name,
        symbol: TOKEN_CONFIG.symbol,
        description: TOKEN_CONFIG.description,
        imageUrl: TOKEN_CONFIG.imageUrl,
        twitter: TOKEN_CONFIG.twitter,
        website: TOKEN_CONFIG.website,
    });

    console.log(`✅ Token Mint: ${tokenInfo.tokenMint}`);
    console.log(`📄 Metadata URI: ${tokenInfo.tokenMetadata}`);

    // Step 2: Create fee sharing config
    console.log('\n💸 Step 2: Creating fee sharing config...');
    const configResult = await sdk.config.createBagsFeeShareConfig({
        payer: keypair.publicKey,
        baseMint: new PublicKey(tokenInfo.tokenMint),
        feeClaimers: FEE_CLAIMERS,
    });

    const configKey = configResult.meteoraConfigKey;
    console.log(`✅ Config Key: ${configKey.toBase58()}`);

    // Sign and send config transactions
    if (configResult.transactions && configResult.transactions.length > 0) {
        console.log(`📝 Signing ${configResult.transactions.length} config transaction(s)...`);
        for (const tx of configResult.transactions) {
            tx.sign([keypair]);
            const sig = await connection.sendRawTransaction(tx.serialize());
            await connection.confirmTransaction(sig, 'confirmed');
            console.log(`  ✅ Config TX: ${sig}`);
        }
    }

    // Step 3: Create and send launch transaction
    console.log('\n🚀 Step 3: Launching token on bonding curve...');
    const launchTx = await sdk.tokenLaunch.createLaunchTransaction({
        metadataUrl: tokenInfo.tokenMetadata,
        tokenMint: new PublicKey(tokenInfo.tokenMint),
        launchWallet: keypair.publicKey,
        initialBuyLamports: TOKEN_CONFIG.initialBuySOL * 1e9,
        configKey,
    });

    launchTx.sign([keypair]);
    const launchSig = await connection.sendRawTransaction(launchTx.serialize());
    await connection.confirmTransaction(launchSig, 'confirmed');

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ TOKEN LAUNCHED SUCCESSFULLY ON BAGS.FM!');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Token Mint:  ${tokenInfo.tokenMint}`);
    console.log(`  Launch TX:   ${launchSig}`);
    console.log(`  Bags Page:   https://bags.fm/token/${tokenInfo.tokenMint}`);
    console.log(`  Solscan:     https://solscan.io/token/${tokenInfo.tokenMint}`);
    console.log('═══════════════════════════════════════════════');

    // Save result to file
    const result = {
        tokenMint: tokenInfo.tokenMint,
        metadataUri: tokenInfo.tokenMetadata,
        configKey: configKey.toBase58(),
        launchSignature: launchSig,
        bagsUrl: `https://bags.fm/token/${tokenInfo.tokenMint}`,
        solscanUrl: `https://solscan.io/token/${tokenInfo.tokenMint}`,
        launchedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
        path.resolve(__dirname, '../data/bags_launch_result.json'),
        JSON.stringify(result, null, 2)
    );
    console.log('\n📁 Result saved to data/bags_launch_result.json');

    return result;
}

launchOnBags().catch(err => {
    console.error('❌ Launch failed:', err.message || err);
    process.exit(1);
});
