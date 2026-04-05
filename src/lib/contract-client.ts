// src/lib/contract-client.ts
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import {
    PublicKey,
    Connection,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { AgroContracts } from './types/agro_contracts'; // генерируется anchor build
import idl from './idl/agro_contracts.json';            // генерируется anchor build

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'Agro111111111111111111111111111111111111111');
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// ═══════════════════════════════════════════════
//  Получить Program
// ═══════════════════════════════════════════════

export function getProgram(wallet: anchor.Wallet) {
    const connection = new Connection(RPC_URL, 'confirmed');
    const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
    });
    return new Program(idl as AgroContracts, PROGRAM_ID, provider);
}

// ═══════════════════════════════════════════════
//  PDA Helpers
// ═══════════════════════════════════════════════

export function getProjectPDA(projectId: string) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('project'), Buffer.from(projectId)],
        PROGRAM_ID
    );
}

export function getVaultPDA(projectPubkey: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), projectPubkey.toBuffer()],
        PROGRAM_ID
    );
}

export function getMilestonePDA(projectPubkey: PublicKey, index: number) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('milestone'), projectPubkey.toBuffer(), Buffer.from([index])],
        PROGRAM_ID
    );
}

export function getVoteRecordPDA(
    milestonePubkey: PublicKey,
    voterPubkey: PublicKey
) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vote'), milestonePubkey.toBuffer(), voterPubkey.toBuffer()],
        PROGRAM_ID
    );
}

export function getInvestorRecordPDA(
    projectPubkey: PublicKey,
    investorPubkey: PublicKey
) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('investor'),
            projectPubkey.toBuffer(),
            investorPubkey.toBuffer(),
        ],
        PROGRAM_ID
    );
}

// ═══════════════════════════════════════════════
//  CLIENT FUNCTIONS (вызываются из компонентов)
// ═══════════════════════════════════════════════

// Инвестировать в проект
export async function investInProject(
    wallet: anchor.Wallet,
    projectId: string,
    amountSOL: number
): Promise<string> {
    const program = getProgram(wallet);
    const [projectPda] = getProjectPDA(projectId);
    const [vaultPda] = getVaultPDA(projectPda);
    const [investorRecordPda] = getInvestorRecordPDA(
        projectPda,
        wallet.publicKey
    );

    const tx = await program.methods
        .invest(new anchor.BN(amountSOL * LAMPORTS_PER_SOL))
        .accounts({
            investor: wallet.publicKey,
            project: projectPda,
            vault: vaultPda,
            investorRecord: investorRecordPda,
            systemProgram: SystemProgram.programId,
        })
        .rpc();

    return tx;
}

// Проголосовать
export async function voteOnMilestone(
    wallet: anchor.Wallet,
    projectId: string,
    milestoneIndex: number,
    approve: boolean,
    agroTokenAccount: PublicKey,
    tokenProgramId: PublicKey
): Promise<string> {
    const program = getProgram(wallet);
    const [projectPda] = getProjectPDA(projectId);
    const [milestonePda] = getMilestonePDA(projectPda, milestoneIndex);
    const [voteRecordPda] = getVoteRecordPDA(milestonePda, wallet.publicKey);

    const tx = await program.methods
        .castVote(milestoneIndex, approve)
        .accounts({
            voter: wallet.publicKey,
            project: projectPda,
            milestone: milestonePda,
            agroTokenAccount,
            voteRecord: voteRecordPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: tokenProgramId,
        })
        .rpc();

    return tx;
}

// Получить состояние проекта
export async function getProjectState(
    wallet: anchor.Wallet,
    projectId: string
) {
    const program = getProgram(wallet);
    const [projectPda] = getProjectPDA(projectId);
    const [vaultPda] = getVaultPDA(projectPda);

    const [project, vaultBalance] = await Promise.all([
        program.account.fundingProject.fetch(projectPda),
        program.provider.connection.getBalance(vaultPda),
    ]);

    // Загружаем все milestones
    const milestones = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
            const [milestonePda] = getMilestonePDA(projectPda, i);
            return (program.account as any).milestone
                .fetch(milestonePda)
                .catch(() => null);
        })
    );

    return {
        project,
        projectPda,
        vaultPda,
        vaultBalanceSOL: vaultBalance / LAMPORTS_PER_SOL,
        milestones,
    };
}
