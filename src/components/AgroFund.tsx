"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { checkTokenBalance, TOKEN_MINTS } from "@/lib/bags-sdk";

// ═══════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════

interface Milestone {
    id: number;
    title: string;
    description: string;
    amount: number;
    percentage: number;
    status:
    | "locked"
    | "oracle_confirmed"
    | "voting"
    | "released"
    | "rejected";
    oracleProof?: string;
    votingDeadline?: Date;
    yesVotes: number;
    noVotes: number;
    totalEligibleVotes: number;
}

interface FundingProject {
    id: string;
    name: string;
    tokenSymbol: string;
    tokenMint: string;
    supplier: string;
    supplierKYC: boolean;
    commodity: string;
    volume: string;
    route: string;
    targetRaise: number;
    currentRaised: number;
    milestones: Milestone[];
    investors: number;
    createdAt: Date;
}

// ═══════════════════════════════════════════════
//  MOCK DATA
// ═══════════════════════════════════════════════

const MOCK_PROJECTS: FundingProject[] = [
    {
        id: "owht-oc26",
        name: "Odesa-Cairo Wheat Corridor Q3 2026",
        tokenSymbol: "oWHT-OC26",
        tokenMint: TOKEN_MINTS.oWHT || "placeholder",
        supplier: "GrainCorp UA",
        supplierKYC: true,
        commodity: "Wheat Grade 1",
        volume: "200,000 MT",
        route: "Port of Odesa → Port of Alexandria",
        targetRaise: 4200000,
        currentRaised: 3150000,
        milestones: [
            {
                id: 1,
                title: "Contract Signing & Insurance",
                description:
                    "Execution of forward contract and cargo insurance binding",
                amount: 420000,
                percentage: 10,
                status: "released",
                oracleProof: "QmXk...abc1",
                yesVotes: 3100000,
                noVotes: 50000,
                totalEligibleVotes: 3150000,
            },
            {
                id: 2,
                title: "Warehouse Verification & Audit",
                description:
                    "Independent physical audit of 200K MT in Odesa silos",
                amount: 840000,
                percentage: 20,
                status: "released",
                oracleProof: "QmYz...def2",
                yesVotes: 2800000,
                noVotes: 200000,
                totalEligibleVotes: 3150000,
            },
            {
                id: 3,
                title: "Loading & Ship Departure",
                description:
                    "Vessel loaded, Bill of Lading issued, AIS departure confirmed",
                amount: 1260000,
                percentage: 30,
                status: "voting",
                oracleProof: "QmZz...ghi3",
                votingDeadline: new Date(
                    Date.now() + 18 * 60 * 60 * 1000
                ), // 18h from now
                yesVotes: 2110000,
                noVotes: 378000,
                totalEligibleVotes: 3150000,
            },
            {
                id: 4,
                title: "In-Transit Oracle Confirmation",
                description:
                    "AIS tracking confirms vessel en route, ETA within range",
                amount: 840000,
                percentage: 20,
                status: "locked",
                yesVotes: 0,
                noVotes: 0,
                totalEligibleVotes: 0,
            },
            {
                id: 5,
                title: "Delivery & Final Settlement",
                description:
                    "Cargo discharged at Alexandria, weight certificates matched",
                amount: 840000,
                percentage: 20,
                status: "locked",
                yesVotes: 0,
                noVotes: 0,
                totalEligibleVotes: 0,
            },
        ],
        investors: 147,
        createdAt: new Date("2026-02-15"),
    },
];

// ═══════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════

export function AgroFund() {
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [projects, setProjects] = useState<FundingProject[]>(MOCK_PROJECTS);
    const [selectedProject, setSelectedProject] =
        useState<FundingProject | null>(null);
    const [userBalance, setUserBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Check user's token balance for voting weight
    useEffect(() => {
        async function checkBalance() {
            if (!publicKey || !selectedProject) return;

            try {
                // Return mock balance for demo if no mint
                if (selectedProject.tokenMint === "placeholder") {
                    setUserBalance(1500);
                    return;
                }

                const result = await checkTokenBalance(
                    publicKey.toBase58(),
                    selectedProject.tokenMint
                );
                setUserBalance(result.balance);
            } catch (error) {
                console.error("Error checking balance:", error);
            }
        }
        checkBalance();
    }, [publicKey, selectedProject]);

    // Helper: Milestone status badge
    function getMilestoneStatusBadge(status: Milestone["status"]) {
        const badges = {
            locked: {
                icon: "🔒",
                label: "Locked",
                class: "status-locked",
            },
            oracle_confirmed: {
                icon: "🔮",
                label: "Oracle ✓",
                class: "status-oracle",
            },
            voting: {
                icon: "🗳️",
                label: "Voting",
                class: "status-voting",
            },
            released: {
                icon: "✅",
                label: "Released",
                class: "status-released",
            },
            rejected: {
                icon: "❌",
                label: "Rejected",
                class: "status-rejected",
            },
        };
        return badges[status];
    }

    // Helper: Format remaining time
    function formatTimeRemaining(deadline: Date): string {
        const diff = deadline.getTime() - Date.now();
        if (diff <= 0) return "Ended";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(
            (diff % (1000 * 60 * 60)) / (1000 * 60)
        );
        return `${hours}h ${minutes}m remaining`;
    }

    // ── Function: Oracle Simulation ──
    const handleOracleSimulate = async (projectId: string, milestoneId: number) => {
        setLoading(true);
        setMessage('🔮 Simulating logistics oracle...');

        try {
            const res = await fetch('/api/milestone/oracle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, milestoneId }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage(`✅ Oracle confirmed! Voting started for "${data.milestone.title}"`);
                // Update local state if needed (in a real app we'd fetch)
                if (selectedProject) {
                    const updatedMilestones = selectedProject.milestones.map(m =>
                        m.id === milestoneId ? { ...m, status: data.milestone.status as any, votingDeadline: new Date(data.milestone.votingDeadline) } : m
                    );
                    setSelectedProject({ ...selectedProject, milestones: updatedMilestones });
                }
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch (error) {
            setMessage('❌ Oracle simulation failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Function: Voting ──
    const handleVote = async (
        projectId: string,
        milestoneId: number,
        vote: 'yes' | 'no'
    ) => {
        if (!publicKey) {
            setMessage('⚠️ Connect your wallet first!');
            return;
        }

        setLoading(true);
        setMessage('🗳️ Recording your vote...');

        try {
            const res = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    milestoneId,
                    walletAddress: publicKey.toBase58(),
                    vote,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage(
                    `✅ Vote recorded! ${vote.toUpperCase()} | Weight: ${data.voter.voteWeight} $AGRO | ` +
                    `Total: ${data.milestone.yesPercent}% YES`
                );
                // Update local state
                if (selectedProject) {
                    const updatedMilestones = selectedProject.milestones.map(m =>
                        m.id === milestoneId ? { ...m, yesVotes: data.milestone.yesVotes, noVotes: data.milestone.noVotes } : m
                    );
                    setSelectedProject({ ...selectedProject, milestones: updatedMilestones });
                }
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error) {
            setMessage('❌ Voting failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Function: Release Funds ──
    const handleRelease = async (projectId: string, milestoneId: number) => {
        setLoading(true);
        setMessage('💸 Releasing funds from vault...');

        try {
            const res = await fetch('/api/milestone/release', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, milestoneId }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage(
                    `🎉 FUNDS RELEASED! ${data.transaction.amountSOL} SOL sent! ` +
                    `Tx: ${data.transaction.signature.slice(0, 12)}...`
                );
                // Открыть explorer в новой вкладке
                window.open(data.transaction.explorerUrl, '_blank');
                // Update local state
                if (selectedProject) {
                    const updatedMilestones = selectedProject.milestones.map(m =>
                        m.id === milestoneId ? { ...m, status: 'released' as any } : m
                    );
                    setSelectedProject({ ...selectedProject, milestones: updatedMilestones });
                }
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (error) {
            setMessage(`❌ Release failed: ${(error as any).message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="agrofund">
            <div className="agrofund-header">
                <h2>🌾 AgroFund — Milestone Crowdfunding</h2>
                <p>
                    DAO-governed commodity funding with logistics oracle
                    verification
                </p>
                <div className="agrofund-stats-bar">
                    <div className="agrofund-stat">
                        <span className="stat-value">
                            {projects.length}
                        </span>
                        <span className="stat-label">
                            Active Projects
                        </span>
                    </div>
                    <div className="agrofund-stat">
                        <span className="stat-value">
                            $
                            {projects
                                .reduce((acc, p) => acc + p.currentRaised, 0)
                                .toLocaleString()}
                        </span>
                        <span className="stat-label">Total Raised</span>
                    </div>
                    <div className="agrofund-stat">
                        <span className="stat-value">
                            {projects.reduce(
                                (acc, p) => acc + p.investors,
                                0
                            )}
                        </span>
                        <span className="stat-label">Investors</span>
                    </div>
                </div>
            </div>

            {/* ── Project List ── */}
            <div className="agrofund-projects">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="agrofund-project-card"
                        onClick={() => setSelectedProject(project)}
                    >
                        <div className="project-card-top">
                            <div className="project-card-commodity">
                                {project.commodity === "Wheat Grade 1"
                                    ? "🌾"
                                    : project.commodity.includes("Oil")
                                        ? "🛢️"
                                        : project.commodity.includes("LNG")
                                            ? "⚡"
                                            : "📦"}
                            </div>
                            <div className="project-card-info">
                                <h3>{project.name}</h3>
                                <p>
                                    {project.supplier}{" "}
                                    {project.supplierKYC ? "(KYC ✅)" : ""}{" "}
                                    · {project.volume}
                                </p>
                                <p className="project-route">
                                    🗺️ {project.route}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="project-progress">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${(project.currentRaised /
                                            project.targetRaise) *
                                            100
                                            }%`,
                                    }}
                                />
                            </div>
                            <div className="progress-labels">
                                <span>
                                    ${project.currentRaised.toLocaleString()}{" "}
                                    raised
                                </span>
                                <span>
                                    {(
                                        (project.currentRaised /
                                            project.targetRaise) *
                                        100
                                    ).toFixed(0)}
                                    %
                                </span>
                                <span>
                                    Target: $
                                    {project.targetRaise.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Milestones Mini-View */}
                        <div className="project-milestones-mini">
                            {project.milestones.map((m) => {
                                const badge = getMilestoneStatusBadge(
                                    m.status
                                );
                                return (
                                    <div
                                        key={m.id}
                                        className={`milestone-mini ${badge.class}`}
                                    >
                                        <span>{badge.icon}</span>
                                        <span>M{m.id}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="project-card-actions">
                            <a
                                href={
                                    !project.tokenMint || project.tokenMint.startsWith("mock") || project.tokenMint === "placeholder"
                                        ? "https://bags.fm"
                                        : `https://bags.fm/token/${project.tokenMint}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-bags-sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                💰 Invest on Bags
                            </a>
                            <button
                                className="btn-details"
                                onClick={() => setSelectedProject(project)}
                            >
                                📋 Details & Vote
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Milestone Detail Modal ── */}
            {selectedProject && (
                <div
                    className="milestone-modal-overlay"
                    onClick={() => setSelectedProject(null)}
                >
                    <div
                        className="milestone-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="modal-close"
                            onClick={() => setSelectedProject(null)}
                        >
                            ✕
                        </button>

                        <h2>{selectedProject.name}</h2>
                        <p className="modal-subtitle">
                            Token:{" "}
                            <strong>
                                ${selectedProject.tokenSymbol}
                            </strong>{" "}
                            · Your balance:{" "}
                            <strong>
                                {userBalance.toLocaleString()}
                            </strong>{" "}
                            (vote weight)
                        </p>

                        {message && (
                            <div className={`api-status-message ${message.includes('❌') ? 'error' : 'success'}`}>
                                {message}
                            </div>
                        )}

                        <div className="milestones-detail-list">
                            {selectedProject.milestones.map((m) => {
                                const badge = getMilestoneStatusBadge(
                                    m.status
                                );
                                const yesPercent =
                                    m.yesVotes + m.noVotes > 0
                                        ? (m.yesVotes /
                                            (m.yesVotes + m.noVotes)) *
                                        100
                                        : 0;

                                return (
                                    <div
                                        key={m.id}
                                        className={`milestone-detail-card ${badge.class}`}
                                    >
                                        <div className="milestone-detail-header">
                                            <span className="milestone-number">
                                                {badge.icon} M{m.id}
                                            </span>
                                            <span className="milestone-title">
                                                {m.title}
                                            </span>
                                            <span
                                                className={`milestone-badge ${badge.class}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="milestone-desc">
                                            {m.description}
                                        </p>
                                        <div className="milestone-amount">
                                            💰 ${m.amount.toLocaleString()}{" "}
                                            ({m.percentage}%)
                                        </div>

                                        {m.status === "locked" && (
                                            <div className="milestone-admin-demo">
                                                <button
                                                    className="btn-simulate-oracle"
                                                    disabled={loading}
                                                    onClick={() => handleOracleSimulate(selectedProject.id, m.id)}
                                                >
                                                    🔮 Simulate Logistics Oracle
                                                </button>
                                            </div>
                                        )}

                                        {/* Voting section */}
                                        {m.status === "voting" && (
                                            <div className="milestone-voting">
                                                <div className="voting-timer">
                                                    ⏱️{" "}
                                                    {m.votingDeadline
                                                        ? formatTimeRemaining(
                                                            m.votingDeadline
                                                        )
                                                        : "N/A"}
                                                </div>

                                                <div className="vote-bar">
                                                    <div
                                                        className="vote-bar-yes"
                                                        style={{
                                                            width: `${yesPercent}%`,
                                                        }}
                                                    />
                                                    <div
                                                        className="vote-bar-no"
                                                        style={{
                                                            width: `${100 -
                                                                yesPercent
                                                                }%`,
                                                        }}
                                                    />
                                                </div>
                                                <div className="vote-labels">
                                                    <span className="vote-yes">
                                                        ✅{" "}
                                                        {yesPercent.toFixed(
                                                            1
                                                        )}
                                                        % YES (
                                                        {(
                                                            m.yesVotes /
                                                            1000
                                                        ).toFixed(0)}
                                                        K)
                                                    </span>
                                                    <span className="vote-no">
                                                        ❌{" "}
                                                        {(
                                                            100 -
                                                            yesPercent
                                                        ).toFixed(1)}
                                                        % NO (
                                                        {(
                                                            m.noVotes /
                                                            1000
                                                        ).toFixed(0)}
                                                        K)
                                                    </span>
                                                </div>

                                                <div className="vote-status-bar">
                                                    {m.yesVotes + m.noVotes < 3 && (
                                                        <span className="quorum-hint">Need {3 - (m.yesVotes + m.noVotes)} more votes for quorum</span>
                                                    )}
                                                    {m.yesVotes + m.noVotes >= 3 && yesPercent > 51 && (
                                                        <span className="quorum-hint success">✓ Quorum reached. Ready for release.</span>
                                                    )}
                                                </div>

                                                {m.oracleProof && (
                                                    <div className="oracle-proof">
                                                        📄 Oracle Proof:{" "}
                                                        <a
                                                            href={`https://ipfs.io/ipfs/${m.oracleProof}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {m.oracleProof.slice(
                                                                0,
                                                                12
                                                            )}
                                                            ...
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                {connected && (
                                                    <div className="vote-buttons">
                                                        <button
                                                            className="btn-vote-yes"
                                                            disabled={loading || userBalance === 0}
                                                            onClick={() =>
                                                                handleVote(
                                                                    selectedProject.id,
                                                                    m.id,
                                                                    'yes'
                                                                )
                                                            }
                                                        >
                                                            {loading ? '...' : '✅ Approve Release'}
                                                        </button>
                                                        <button
                                                            className="btn-vote-no"
                                                            disabled={loading || userBalance === 0}
                                                            onClick={() =>
                                                                handleVote(
                                                                    selectedProject.id,
                                                                    m.id,
                                                                    'no'
                                                                )
                                                            }
                                                        >
                                                            {loading ? '...' : '❌ Reject'}
                                                        </button>
                                                        {yesPercent > 51 && m.yesVotes + m.noVotes >= 3 && (
                                                            <button
                                                                className="btn-release-funds"
                                                                disabled={loading}
                                                                onClick={() => handleRelease(selectedProject.id, m.id)}
                                                            >
                                                                💸 Release SOL
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {connected &&
                                                    userBalance === 0 && (
                                                        <p className="no-tokens-warning">
                                                            ⚠️ You need $
                                                            {
                                                                selectedProject.tokenSymbol
                                                            }{" "}
                                                            tokens to
                                                            vote.{" "}
                                                            <a
                                                                href="https://bags.fm"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                Buy on
                                                                Bags.fm
                                                            </a>
                                                        </p>
                                                    )}
                                            </div>
                                        )}

                                        {m.status === "released" && (
                                            <div className="milestone-released">
                                                ✅ Funds released · Oracle:{" "}
                                                {m.oracleProof?.slice(
                                                    0,
                                                    12
                                                )}
                                                ... · Vote:{" "}
                                                {yesPercent.toFixed(0)}%
                                                YES
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
