// scripts/init_fundraising_devnet.ts
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import idl from '../agro-contracts/target/idl/agro_contracts.json';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey("4AS7EuDqPwp9afTq42SsyNQHrFU2ZhYAhu259gpPYgEQ");

const PROJECT_CONFIG = {
    id: 'owht-cairo-q3-2026',
    name: 'Odesa-Cairo Wheat Corridor Q3 2026',
    supplier: process.env.SUPPLIER_WALLET || "bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg",
    oracle: process.env.ORACLE_WALLET || "bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg",
    agroMint: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT!,
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
    const adminKeypair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));
    const wallet = new anchor.Wallet(adminKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(idl as any, provider);

    const [projectPda] = PublicKey.findProgramAddressSync([Buffer.from('project'), Buffer.from(PROJECT_CONFIG.id)], PROGRAM_ID);
    const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from('vault'), projectPda.toBuffer()], PROGRAM_ID);

    console.log(`Step 1: Creating project ${PROJECT_CONFIG.id}...`);
    try {
        await program.methods
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
            } as any)
            .rpc();
        console.log(`✅ Project created: ${projectPda.toBase58()}`);
    } catch (e: any) {
        console.log('⚠️ Project might already exist');
    }

    for (const m of PROJECT_CONFIG.milestones) {
        const [mPda] = PublicKey.findProgramAddressSync([Buffer.from('milestone'), projectPda.toBuffer(), Buffer.from([m.index])], PROGRAM_ID);
        try {
            await program.methods
                .initializeMilestone(m.index, new anchor.BN(m.amountSOL * LAMPORTS_PER_SOL), m.percentage)
                .accounts({
                    admin: adminKeypair.publicKey,
                    project: projectPda,
                    milestone: mPda,
                    systemProgram: SystemProgram.programId,
                } as any)
                .rpc();
            console.log(`✅ Milestone ${m.index} created`);
        } catch (e) {
            console.log(`⚠️ Milestone ${m.index} failed/exists`);
        }
    }
}

initializeFundraising().then(() => process.exit(0));
