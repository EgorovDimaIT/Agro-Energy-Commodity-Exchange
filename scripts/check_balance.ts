// scripts/check_balance.ts
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.error('No PRIVATE_KEY found in .env.local');
        return;
    }

    try {
        const keypair = Keypair.fromSecretKey(bs58.decode(pk));
        console.log('Address:', keypair.publicKey.toBase58());

        // Check Devnet
        const connectionDev = new Connection('https://api.devnet.solana.com', 'confirmed');
        const balanceDev = await connectionDev.getBalance(keypair.publicKey);
        console.log('Devnet Balance:', balanceDev / 1e9, 'SOL');

        // Check Mainnet
        const connectionMain = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const balanceMain = await connectionMain.getBalance(keypair.publicKey);
        console.log('Mainnet Balance:', balanceMain / 1e9, 'SOL');
    } catch (e) {
        console.error('Error decoding PK:', e);
    }
}

check();
