"use client";

import { useState, useEffect, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TOKEN_MINTS, checkTokenBalance } from "@/lib/bags-sdk";

interface BagsAccessGateProps {
    children: ReactNode;
    requiredToken?: string;
    minBalance?: number;
    gatedFeature?: string;
}

export function BagsAccessGate({
    children,
    requiredToken = "AGRO",
    minBalance = 1,
    gatedFeature = "Institutional RWA Vault",
}: BagsAccessGateProps) {
    const { publicKey, connected } = useWallet();
    const [hasAccess, setHasAccess] = useState(false);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        async function verifyAccess() {
            if (!publicKey || !connected) {
                setHasAccess(false);
                setChecked(false);
                return;
            }

            setLoading(true);
            try {
                const tokenMint =
                    TOKEN_MINTS[requiredToken as keyof typeof TOKEN_MINTS];
                if (!tokenMint) {
                    // If no mint configured yet — grant access for demo
                    setHasAccess(true);
                    setBalance(0);
                    setLoading(false);
                    setChecked(true);
                    return;
                }

                const result = await checkTokenBalance(
                    publicKey.toBase58(),
                    tokenMint
                );

                setBalance(result.balance);
                setHasAccess(result.balance >= minBalance);
            } catch (error) {
                console.error("Access verification failed:", error);
                setHasAccess(true); // fallback: allow access for demo
            } finally {
                setLoading(false);
                setChecked(true);
            }
        }

        verifyAccess();
    }, [publicKey, connected, requiredToken, minBalance]);

    // Helper: Determine Bags.fm link
    const tokenMintStr = TOKEN_MINTS[requiredToken as keyof typeof TOKEN_MINTS];
    const bagsLink = !tokenMintStr || tokenMintStr.startsWith("mock") || tokenMintStr === ""
        ? "https://bags.fm"
        : `https://bags.fm/token/${tokenMintStr}`;

    // ── Not connected ──
    if (!connected) {
        return (
            <div className="access-gate">
                <div className="access-gate-card">
                    <div className="access-gate-icon">🔐</div>
                    <h2>Connect Your Wallet</h2>
                    <p>
                        Access to <strong>{gatedFeature}</strong> requires a
                        Solana wallet with{" "}
                        <strong>${requiredToken}</strong> tokens.
                    </p>
                    <div className="access-gate-actions">
                        <WalletMultiButton />
                    </div>
                    <div className="access-gate-info">
                        <p>
                            💡 Get <strong>${requiredToken}</strong> on{" "}
                            <a
                                href={bagsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bags-link"
                            >
                                Bags.fm
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Loading ──
    if (loading || !checked) {
        return (
            <div className="access-gate">
                <div className="access-gate-card">
                    <div className="access-gate-spinner" />
                    <p>Verifying ${requiredToken} token holdings...</p>
                    <p className="access-gate-wallet">
                        {publicKey?.toBase58().slice(0, 8)}...
                        {publicKey?.toBase58().slice(-6)}
                    </p>
                </div>
            </div>
        );
    }

    // ── No access ──
    if (!hasAccess) {
        return (
            <div className="access-gate">
                <div className="access-gate-card access-gate-denied">
                    <div className="access-gate-icon">⛔</div>
                    <h2>Access Required</h2>
                    <p>
                        You need at least{" "}
                        <strong>
                            {minBalance} ${requiredToken}
                        </strong>{" "}
                        to access <strong>{gatedFeature}</strong>.
                    </p>
                    <p className="access-gate-balance">
                        Your current balance:{" "}
                        <strong>
                            {balance} ${requiredToken}
                        </strong>
                    </p>
                    <div className="access-gate-actions">
                        <a
                            href={bagsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-bags"
                        >
                            🛍️ Buy ${requiredToken} on Bags.fm
                        </a>
                        <WalletMultiButton />
                    </div>
                </div>
            </div>
        );
    }

    // ── Access granted ──
    return (
        <div>
            <div className="access-badge">
                <span className="access-badge-icon">✅</span>
                <span>
                    Verified: {balance.toLocaleString()} ${requiredToken}
                </span>
                <span className="access-badge-tier">
                    {balance >= 10000
                        ? "🏆 Whale"
                        : balance >= 1000
                            ? "🥇 Gold"
                            : balance >= 100
                                ? "🥈 Silver"
                                : "🥉 Bronze"}
                </span>
            </div>
            {children}
        </div>
    );
}
