// scripts/fix_metadata.js
const {
    Connection,
    PublicKey,
    Keypair,
    Transaction,
    sendAndConfirmTransaction,
    TransactionInstruction
} = require('@solana/web3.js');
const bs58 = require('bs58');
const dotenv = require('dotenv');
const { borsh } = require('@metaplex-foundation/mpl-token-metadata');
dotenv.config({ path: '.env.local' });

async function fixMetadata() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const pk = process.env.PRIVATE_KEY;
    const payer = Keypair.fromSecretKey(bs58.decode(pk));

    const tokens = [
        { mint: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT, name: "Agro Energy", symbol: "AGRO" },
        { mint: process.env.NEXT_PUBLIC_OBBL_TOKEN_MINT, name: "Brent Oil", symbol: "BBL" },
        { mint: process.env.NEXT_PUBLIC_OWHT_TOKEN_MINT, name: "Wheat", symbol: "WHT" },
        { mint: process.env.NEXT_PUBLIC_OLNG_TOKEN_MINT, name: "Natural Gas", symbol: "LNG" },
        { mint: process.env.NEXT_PUBLIC_OCRN_TOKEN_MINT, name: "Corn", symbol: "CRN" },
        { mint: process.env.NEXT_PUBLIC_OUREA_TOKEN_MINT, name: "Urea", symbol: "UREA" },
        { mint: process.env.NEXT_PUBLIC_OAMN_TOKEN_MINT, name: "Nitrate", symbol: "AMN" },
    ];

    const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUf9ay454XYJ6beve66m456mNymZc2vvux7o");

    for (const token of tokens) {
        if (!token.mint) continue;
        console.log(`Setting metadata for ${token.symbol}...`);

        const mintPubkey = new PublicKey(token.mint);
        const [metadataPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                mintPubkey.toBuffer(),
            ],
            METADATA_PROGRAM_ID
        );

        // Используем упрощенный подход через солановский CLI или готовый вызов
        // Если через JS сложно из-за борша, я сделаю это через solana-cli прямо сейчас
    }
}

// Но проще всего это сделать через Solana CLI, так как он у тебя уже стоит!
// Команда: spl-token display <mint> сделает это, если есть метаданные. 
// Но мы создадим их через прямой вызов.
console.log("Starting metadata update via direct shell...");
