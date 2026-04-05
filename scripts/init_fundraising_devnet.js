// scripts/init_fundraising_devnet.js
const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const idl = require('../agro-contracts/target/idl/agro_contracts.json');
const bs58 = require('bs58');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });

const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey("4AS7EuDqPwp9afTq42SsyNQHrFU2ZhYAhu259gpPYgEQ");

const PROJECT_CONFIG = {
    id: 'owht-cairo-q3-2026',
    name: 'Odesa-Cairo Wheat Corridor Q3 2026',
    supplier: "bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg",
    oracle: "bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg",
    agroMint: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT || "BZBvHcjsZJVKwLJSesCSe3CyVJubXWAsz7Yo6VQ2bSA1",
    targetSOL: 5.0,
    milestones: [
        { index: 0, title: 'Contract Signing & Insurance', percentage: 10, amountSOL: 0.5 },
        { index: 1, title: 'Warehouse Verification & Audit', percentage: 20, amountSOL: 1.0 },
        { index: 2, title: 'Loading & Ship Departure', percentage: 30, amountSOL: 1.5 },
        { index: 3, title: 'In-Transit Oracle Confirmation', percentage: 20, amountSOL: 1.0 },
        { index: 4, title: 'Final Delivery & Settlement', percentage: 20, amountSOL: 1.0 },
    ],
};

async function initializeFundraising() {
    console.log('🚀 Initializing Fundraising on Devnet');
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));
    const wallet = new anchor.Wallet(adminKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });

    const program = new anchor.Program(idl, PROGRAM_ID, provider);

    const [projectPda] = PublicKey.findProgramAddressSync([Buffer.from('project'), Buffer.from(PROJECT_CONFIG.id)], PROGRAM_ID);
    const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from('vault'), projectPda.toBuffer()], PROGRAM_ID);

    console.log(`Step 1: Creating project ${PROJECT_CONFIG.id}...`);
    try {
        const tx = await program.methods
            .initializeProject(
                PROJECT_CONFIG.id,
                PROJECT_CONFIG.name,
                new PublicKey(PROJECT_CONFIG.supplier),
                new PublicKey(PROJECT_CONFIG.oracle),
                new PublicKey(PROJECT_CONFIG.agroMint),
                new anchor.BN(PROJECT_CONFIG.targetSOL * LAMPORTS_PER_SOL)
            )
            .accounts({
                admin: adminKeypair.publicKey,
                project: projectPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        console.log(`✅ Project created: ${tx}`);
    } catch (e) {
        console.log(`⚠️ Project already exists or error: ${e.message}`);
    }

    for (const m of PROJECT_CONFIG.milestones) {
        const [mPda] = PublicKey.findProgramAddressSync([Buffer.from('milestone'), projectPda.toBuffer(), Buffer.from([m.index])], PROGRAM_ID);
        try {
            const tx = await program.methods
                .initializeMilestone(m.index, new anchor.BN(m.amountSOL * LAMPORTS_PER_SOL), m.percentage)
                .accounts({
                    admin: adminKeypair.publicKey,
                    project: projectPda,
                    milestone: mPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            console.log(`✅ Milestone ${m.index} created: ${tx}`);
        } catch (e) {
            console.log(`⚠️ Milestone ${m.index} failed`);
        }
    }
}

initializeFundraising().catch(console.error);
