// scripts/prepare_deploy.js
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function prepare() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.error('No PRIVATE_KEY found');
        return;
    }

    try {
        const keypair = Keypair.fromSecretKey(bs58.decode(pk));
        const secretKeyArr = Array.from(keypair.secretKey);
        fs.writeFileSync('deploy_key.json', JSON.stringify(secretKeyArr));
        console.log('Deploy Keypair Saved: bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg');
    } catch (e) {
        console.error('Error saving PK:', e);
    }
}

prepare();
