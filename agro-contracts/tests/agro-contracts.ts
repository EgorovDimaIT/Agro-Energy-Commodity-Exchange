// tests/agro-contracts.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AgroContracts } from "../target/types/agro_contracts";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
    createMint,
    createAccount,
    mintTo,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("Agro-Energy Escrow Contracts", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.AgroContracts as Program<AgroContracts>;

    // Участники
    const admin = (provider.wallet as anchor.Wallet).payer;
    const supplier = Keypair.generate();
    const oracle = Keypair.generate();
    const investor1 = Keypair.generate();
    const investor2 = Keypair.generate();
    const investor3 = Keypair.generate();

    const PROJECT_ID = "owht-test-001";

    // Суммы milestone (суммарно = 1 SOL)
    const MILESTONES = [
        { pct: 10, lamports: 0.10 * LAMPORTS_PER_SOL },
        { pct: 20, lamports: 0.20 * LAMPORTS_PER_SOL },
        { pct: 30, lamports: 0.30 * LAMPORTS_PER_SOL },
        { pct: 20, lamports: 0.20 * LAMPORTS_PER_SOL },
        { pct: 20, lamports: 0.20 * LAMPORTS_PER_SOL },
    ];

    let agroMint: PublicKey;
    let investor1TokenAccount: PublicKey;
    let investor2TokenAccount: PublicKey;
    let investor3TokenAccount: PublicKey;
    let projectPda: PublicKey;
    let vaultPda: PublicKey;

    before(async () => {
        // Airdrops
        const airdrops = [supplier, oracle, investor1, investor2, investor3]
            .map(kp =>
                provider.connection.requestAirdrop(kp.publicKey, 3 * LAMPORTS_PER_SOL)
            );
        await Promise.all(airdrops);
        await new Promise(r => setTimeout(r, 2000));

        // Создаём AGRO токен
        agroMint = await createMint(
            provider.connection, admin, admin.publicKey, null, 6
        );

        // Создаём токен аккаунты для инвесторов
        investor1TokenAccount = await createAccount(
            provider.connection, investor1, agroMint, investor1.publicKey
        );
        investor2TokenAccount = await createAccount(
            provider.connection, investor2, agroMint, investor2.publicKey
        );
        investor3TokenAccount = await createAccount(
            provider.connection, investor3, agroMint, investor3.publicKey
        );

        // Минтим AGRO токены
        await mintTo(provider.connection, admin, agroMint, investor1TokenAccount,
            admin, 1_000 * 1e6);  // 1000 AGRO (Gold tier)
        await mintTo(provider.connection, admin, agroMint, investor2TokenAccount,
            admin, 500 * 1e6);   // 500 AGRO (Silver tier)
        await mintTo(provider.connection, admin, agroMint, investor3TokenAccount,
            admin, 100 * 1e6);   // 100 AGRO (Silver tier)

        // Вычисляем PDA адреса
        [projectPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("project"), Buffer.from(PROJECT_ID)],
            program.programId
        );

        [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), projectPda.toBuffer()],
            program.programId
        );

        console.log("✅ Setup complete");
        console.log(`   Project PDA: ${projectPda}`);
        console.log(`   Vault PDA:   ${vaultPda}`);
        console.log(`   AGRO Mint:   ${agroMint}`);
    });

    it("1. Initializes project", async () => {
        await program.methods
            .initializeProject(
                PROJECT_ID,
                "Odesa-Cairo Wheat Corridor Q3 2026",
                supplier.publicKey,
                oracle.publicKey,
                agroMint,
                new anchor.BN(1 * LAMPORTS_PER_SOL) // цель: 1 SOL
            )
            .accounts({
                admin: admin.publicKey,
                project: projectPda,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        const project = await program.account.fundingProject.fetch(projectPda);
        expect(project.status.funding).to.not.be.undefined;
        expect(project.targetLamports.toNumber()).to.equal(LAMPORTS_PER_SOL);
        console.log("   ✅ Project created on-chain");
    });

    it("2. Initializes all 5 milestones", async () => {
        for (let i = 0; i < MILESTONES.length; i++) {
            const [milestonePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("milestone"), projectPda.toBuffer(), Buffer.from([i])],
                program.programId
            );

            await program.methods
                .initializeMilestone(
                    i,
                    new anchor.BN(MILESTONES[i].lamports),
                    MILESTONES[i].pct
                )
                .accounts({
                    admin: admin.publicKey,
                    project: projectPda,
                    milestone: milestonePda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
        }
        console.log("   ✅ 5 milestones created on-chain");
    });

    it("3. Investors fund the project", async () => {
        // 3 инвестора вкладывают SOL
        const investments = [
            { investor: investor1, amount: 0.4 * LAMPORTS_PER_SOL },
            { investor: investor2, amount: 0.35 * LAMPORTS_PER_SOL },
            { investor: investor3, amount: 0.25 * LAMPORTS_PER_SOL },
        ];

        for (const { investor, amount } of investments) {
            const [investorRecordPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("investor"),
                    projectPda.toBuffer(),
                    investor.publicKey.toBuffer(),
                ],
                program.programId
            );

            await program.methods
                .invest(new anchor.BN(amount))
                .accounts({
                    investor: investor.publicKey,
                    project: projectPda,
                    vault: vaultPda,
                    investorRecord: investorRecordPda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([investor])
                .rpc();
        }

        const project = await program.account.fundingProject.fetch(projectPda);
        console.log(`   ✅ Raised: ${project.raisedLamports.toNumber() / LAMPORTS_PER_SOL} SOL`);
        console.log(`   ✅ Status: ${JSON.stringify(project.status)}`);
        expect(project.investorCount).to.equal(3);
        expect(project.raisedLamports.toNumber()).to.equal(LAMPORTS_PER_SOL);
    });

    it("4. Oracle confirms milestone 0", async () => {
        const [milestonePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("milestone"), projectPda.toBuffer(), Buffer.from([0])],
            program.programId
        );

        await program.methods
            .oracleConfirm(0)
            .accounts({
                oracle: oracle.publicKey,
                project: projectPda,
                milestone: milestonePda,
            })
            .signers([oracle])
            .rpc();

        const m = await program.account.milestone.fetch(milestonePda);
        expect(m.status.voting).to.not.be.undefined;
        console.log(`   ✅ Milestone 0 confirmed by oracle`);
        console.log(`   ✅ Voting deadline: ${new Date(m.votingDeadline.toNumber() * 1000)}`);
    });

    it("5. Investors vote YES on milestone 0", async () => {
        const [milestonePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("milestone"), projectPda.toBuffer(), Buffer.from([0])],
            program.programId
        );

        const voters = [
            { kp: investor1, tokenAcc: investor1TokenAccount },
            { kp: investor2, tokenAcc: investor2TokenAccount },
            { kp: investor3, tokenAcc: investor3TokenAccount },
        ];

        for (const { kp, tokenAcc } of voters) {
            const [voteRecordPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("vote"),
                    milestonePda.toBuffer(),
                    kp.publicKey.toBuffer(),
                ],
                program.programId
            );

            await program.methods
                .castVote(0, true) // true = YES
                .accounts({
                    voter: kp.publicKey,
                    project: projectPda,
                    milestone: milestonePda,
                    agroTokenAccount: tokenAcc,
                    voteRecord: voteRecordPda,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([kp])
                .rpc();
        }

        const m = await program.account.milestone.fetch(milestonePda);
        const totalVotes = m.yesVotes.toNumber() + m.noVotes.toNumber();
        const yesPct = (m.yesVotes.toNumber() / totalVotes * 100).toFixed(1);
        console.log(`   ✅ Votes cast: ${m.voterCount} voters | YES: ${yesPct}%`);
    });

    it("6. Waits for voting period and releases funds", async () => {
        // Ждём 15 секунд (voting period = 10 секунд для теста)
        console.log("   ⏳ Waiting for voting period to end (15s)...");
        await new Promise(r => setTimeout(r, 15_000));

        const [milestonePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("milestone"), projectPda.toBuffer(), Buffer.from([0])],
            program.programId
        );

        const supplierBefore = await provider.connection.getBalance(supplier.publicKey);

        await program.methods
            .releaseFunds(0)
            .accounts({
                caller: admin.publicKey,
                project: projectPda,
                milestone: milestonePda,
                vault: vaultPda,
                supplier: supplier.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        const supplierAfter = await provider.connection.getBalance(supplier.publicKey);
        const released = (supplierAfter - supplierBefore) / LAMPORTS_PER_SOL;

        console.log(`   ✅ Released: ${released} SOL to supplier`);
        expect(released).to.be.greaterThan(0);
    });
});
