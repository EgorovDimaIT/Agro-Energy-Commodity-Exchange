const {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
} = require("@solana/web3.js");
const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
} = require("@solana/spl-token");
const bs58 = require("bs58");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function createDevnetToken(connection, payer, name, symbol) {
    console.log(`🔨 Creating ${name} ($${symbol}) on Devnet...`);

    const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        9 // decimals
    );

    console.log(`✅ Mint Address: ${mint.toBase58()}`);

    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey
    );

    // Mint some initial supply to the payer
    const amount = BigInt(1_000_000 * (10 ** 9)); // 1M tokens
    await mintTo(
        connection,
        payer,
        mint,
        ata.address,
        payer,
        amount
    );

    console.log(`📦 Minted 1M tokens to: ${ata.address.toBase58()}`);
    return mint.toBase58();
}

async function main() {
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY not found in .env.local");
    }

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const payer = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

    console.log(`🔑 Using Payer: ${payer.publicKey.toBase58()}`);

    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💰 Current Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.1) {
        console.log("🚰 Requesting Airdrop...");
        const airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSig);
        console.log("✅ Airdrop received.");
    }

    const commodities = [
        { name: "Brent Crude Oil", symbol: "oBBL" },
        { name: "Liquefied Natural Gas", symbol: "oLNG" },
        { name: "Wheat Grade 1", symbol: "oWHT" },
        { name: "Corn Grade 1", symbol: "oCRN" },
        { name: "Urea Fertilizer", symbol: "oUREA" },
        { name: "Ammonium Nitrate", symbol: "oAMN" },
    ];

    const mints = {};
    for (const commodity of commodities) {
        mints[commodity.symbol] = await createDevnetToken(connection, payer, commodity.name, commodity.symbol);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 DEVNET TOKENS CREATED");
    console.log("=".repeat(60));
    for (const [symbol, mint] of Object.entries(mints)) {
        console.log(`${symbol}: ${mint}`);
    }
    console.log("=".repeat(60));
    console.log("\nCopy-paste these into your .env.local:\n");
    for (const [symbol, mint] of Object.entries(mints)) {
        console.log(`NEXT_PUBLIC_${symbol}_TOKEN_MINT=${mint}`);
    }
}

main().catch(console.error);
