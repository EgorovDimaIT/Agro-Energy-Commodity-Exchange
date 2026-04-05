// scripts/check_balance.js
const { Keypair, Connection } = require('@solana/web3.js');
const bs58 = require('bs58');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function check() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.error('No PRIVATE_KEY found in .env.local');
        return;
    }

    try {
        const keypair = Keypair.fromSecretKey(bs58.decode(pk));
        const address = keypair.publicKey.toBase58();
        console.log('Address:', address);

        // Check Devnet
        const connectionDev = new Connection('https://api.devnet.solana.com', 'confirmed');
        const balanceDev = await connectionDev.getBalance(keypair.publicKey);
        console.log('Devnet Balance:', balanceDev / 1e9, 'SOL');
    } catch (e) {
        console.error('Error decoding PK:', e);
    }
}

check();
