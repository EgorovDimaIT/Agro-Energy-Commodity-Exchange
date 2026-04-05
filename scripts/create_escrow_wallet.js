// scripts/create_escrow_wallet.js
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');

const escrowKeypair = Keypair.generate();
const escrowData = {
    publicKey: escrowKeypair.publicKey.toBase58(),
    secretKey: bs58.encode(escrowKeypair.secretKey),
};

if (!fs.existsSync('data')) fs.mkdirSync('data');
fs.writeFileSync('data/escrow-wallet.json', JSON.stringify(escrowData, null, 2));

console.log('✅ Escrow Wallet Created!');
console.log(`Public Key: ${escrowData.publicKey}`);
console.log('--- ADD TO .env.local ---');
console.log(`ESCROW_PUBLIC_KEY=${escrowData.publicKey}`);
console.log(`ESCROW_PRIVATE_KEY=${escrowData.secretKey}`);
