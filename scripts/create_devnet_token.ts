const {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey
} = require("@solana/web3.js");
const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    getAccount,
    getMint
} = require("@solana/spl-token");
const bs58 = require("bs58");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function createDevnetToken() {
    console.log("🚀 Starting Token Creation on Solana Devnet...");

    // 🌐 Step 3: Connect to Devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    console.log("🌐 Connected to Devnet: https://api.devnet.solana.com");

    // 🔑 Step 2: Load or Create Wallet
    let payer;
    const privateKeyStr = process.env.PRIVATE_KEY;

    if (privateKeyStr) {
        try {
            payer = Keypair.fromSecretKey(bs58.decode(privateKeyStr));
            console.log("🔑 Using wallet from .env.local:", payer.publicKey.toBase58());
        } catch (e) {
            console.error("❌ Failed to decode PRIVATE_KEY from .env.local, generating new one...");
            payer = Keypair.generate();
            console.log("🔑 Generated new keypair:", payer.publicKey.toBase58());
        }
    } else {
        payer = Keypair.generate();
        console.log("🔑 Generated new keypair:", payer.publicKey.toBase58());
    }

    // 💸 Step 4: Request Airdrop
    console.log("💸 Requesting airdrop of 1 SOL...");
    try {
        const airdropSignature = await connection.requestAirdrop(
            payer.publicKey,
            LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature);
        console.log("✅ Airdrop successful!");
    } catch (e) {
        console.log("⚠️  Airdrop failed (rate limited?), check balance directly...");
    }

    const balance = await connection.getBalance(payer.publicKey);
    console.log(`💰 Current Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.01 * LAMPORTS_PER_SOL) {
        console.error("❌ Insufficient balance for token creation. Please fund the wallet manually if airdrop fails.");
        return;
    }

    // 🪙 Step 6: Create Token
    console.log("🪙 Creating new SPL Token...");
    // 🧾 Step 10: Set decimals (using 6 as requested in Step 10)
    const decimals = 6;
    const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        decimals
    );
    console.log(`✅ Token Created! Address: ${mint.toBase58()}`);

    // 🏦 Step 7: Create Associated Token Account
    console.log("🏦 Creating associated token account...");
    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey
    );
    console.log(`✅ ATA Created: ${ata.address.toBase58()}`);

    // 🖨 Step 8: Mint Tokens
    console.log("🖨 Minting 1,000,000 tokens...");
    const amount = 1_000_000 * (10 ** decimals);
    await mintTo(
        connection,
        payer,
        mint,
        ata.address,
        payer.publicKey,
        amount
    );
    console.log("✅ Minting successful!");

    // 🔍 Step 9: Verify
    const tokenAccountInfo = await getAccount(connection, ata.address);
    console.log("=".repeat(60));
    console.log("🎉 SUCCESS!");
    console.log(`🪙 Token Mint: ${mint.toBase58()}`);
    console.log(`🏦 My ATA: ${ata.address.toBase58()}`);
    console.log(`💰 Final Balance: ${Number(tokenAccountInfo.amount) / (10 ** decimals)} tokens`);
    console.log("=".repeat(60));

    console.log("\n🧪 Next Step: Copy the Token Mint address and use it in your application.");
}

createDevnetToken().catch(console.error);
