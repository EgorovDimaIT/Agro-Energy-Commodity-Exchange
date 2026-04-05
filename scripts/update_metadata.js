// scripts/update_metadata.js
const {
    Connection,
    PublicKey,
    Keypair,
    Transaction,
    sendAndConfirmTransaction
} = require('@solana/web3.js');
const {
    createCreateMetadataAccountV3Instruction
} = require('@metaplex-foundation/mpl-token-metadata');
const bs58 = require('bs58');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function updateAll() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const pk = process.env.PRIVATE_KEY;
    const payer = Keypair.fromSecretKey(bs58.decode(pk));

    const tokens = [
        { mint: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT, name: "Agro Energy Hub", symbol: "AGRO" },
        { mint: process.env.NEXT_PUBLIC_OBBL_TOKEN_MINT, name: "Brent Crude Oil", symbol: "oBBL" },
        { mint: process.env.NEXT_PUBLIC_OWHT_TOKEN_MINT, name: "Wheat Grade 1", symbol: "oWHT" },
        { mint: process.env.NEXT_PUBLIC_OLNG_TOKEN_MINT, name: "Natural Gas", symbol: "oLNG" },
        { mint: process.env.NEXT_PUBLIC_OCRN_TOKEN_MINT, name: "Corn Grade 1", symbol: "oCRN" },
        { mint: process.env.NEXT_PUBLIC_OUREA_TOKEN_MINT, name: "Urea Fertilizer", symbol: "oUREA" },
        { mint: process.env.NEXT_PUBLIC_OAMN_TOKEN_MINT, name: "Ammonium Nitrate", symbol: "oAMN" },
    ];

    const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUf9ay454XYJ6beve66m456mNymZc2vvux7o");

    for (const token of tokens) {
        if (!token.mint) continue;
        console.log(`Updating ${token.symbol}...`);

        const mintPubkey = new PublicKey(token.mint);
        const [metadataPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                mintPubkey.toBuffer(),
            ],
            METADATA_PROGRAM_ID
        );

        const accounts = {
            metadata: metadataPda,
            mint: mintPubkey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
        };

        const data = {
            name: token.name,
            symbol: token.symbol,
            uri: "", // Можно добавить ссылку на JSON с иконкой
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
        };

        const args = {
            createMetadataAccountArgsV3: {
                data,
                isMutable: true,
                collectionDetails: null,
            },
        };

        const instruction = createCreateMetadataAccountV3Instruction(accounts, args);
        const transaction = new Transaction().add(instruction);

        try {
            const sig = await sendAndConfirmTransaction(connection, transaction, [payer]);
            console.log(`✅ Success for ${token.symbol}: ${sig}`);
        } catch (e) {
            console.log(`❌ Error for ${token.symbol}: Already exists or fee too high`);
        }
    }
}

updateAll();
