// scripts/update_metadata_umi.js
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { createMetadataAccountV3, mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { fromWeb3JsKeypair, fromWeb3JsPublicKey } = require('@metaplex-foundation/umi-web3js-adapters');
const { createSignerFromKeypair, signerIdentity } = require('@metaplex-foundation/umi');
const { Keypair, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
    const umi = createUmi('https://api.devnet.solana.com').use(mplTokenMetadata());

    const pk = process.env.PRIVATE_KEY;
    const web3Keypair = Keypair.fromSecretKey(bs58.decode(pk));
    const umiKeypair = fromWeb3JsKeypair(web3Keypair);
    const signer = createSignerFromKeypair(umi, umiKeypair);
    umi.use(signerIdentity(signer));

    const tokens = [
        { mint: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT, name: "Agro Energy", symbol: "AGRO" },
        { mint: process.env.NEXT_PUBLIC_OBBL_TOKEN_MINT, name: "Brent Crude Oil", symbol: "BBL" },
        { mint: process.env.NEXT_PUBLIC_OWHT_TOKEN_MINT, name: "Wheat Grade 1", symbol: "WHT" },
        { mint: process.env.NEXT_PUBLIC_OLNG_TOKEN_MINT, name: "Natural Gas", symbol: "LNG" },
        { mint: process.env.NEXT_PUBLIC_OCRN_TOKEN_MINT, name: "Corn Grade 1", symbol: "CRN" },
        { mint: process.env.NEXT_PUBLIC_OUREA_TOKEN_MINT, name: "Urea Fertilizer", symbol: "UREA" },
        { mint: process.env.NEXT_PUBLIC_OAMN_TOKEN_MINT, name: "Ammonium Nitrate", symbol: "AMN" },
    ];

    for (const token of tokens) {
        if (!token.mint) continue;
        console.log(`Updating ${token.symbol}...`);

        try {
            await createMetadataAccountV3(umi, {
                mint: fromWeb3JsPublicKey(new PublicKey(token.mint)),
                mintAuthority: signer,
                data: {
                    name: token.name,
                    symbol: token.symbol,
                    uri: '',
                    sellerFeeBasisPoints: 0,
                    creators: null,
                    collection: null,
                    uses: null,
                },
                isMutable: true,
                collectionDetails: null,
            }).sendAndConfirm(umi);
            console.log(`✅ Success for ${token.symbol}`);
        } catch (e) {
            console.log(`❌ Skipped ${token.symbol} (maybe already has metadata)`);
        }
    }
}

run();
