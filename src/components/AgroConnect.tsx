"use client";

import { useState, useEffect } from "react";

import { DividendsDashboard } from "./DividendsDashboard";

// ═══════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════

interface TraderProfile {
    rank: number;
    name: string;
    wallet: string;
    kycLevel: "Individual" | "Institutional";
    kycVerified: boolean;
    avatar: string;
    reputation: number;
    totalInvested: number;
    roi: number;
    winRate: number;
    avgHoldDays: number;
    holdings: { symbol: string; percentage: number }[];
    completedEscrows: number;
    disputes: number;
    onTimeRate: number;
    recentActivity: { action: string; detail: string; time: string }[];
    memberSince: string;
}

// ═══════════════════════════════════════════════
//  MOCK DATA
// ═══════════════════════════════════════════════

const MOCK_TRADERS: TraderProfile[] = [
    {
        rank: 1,
        name: "AlphaGrain Capital",
        wallet: "7xKj...8mNp",
        kycLevel: "Institutional",
        kycVerified: true,
        avatar: "🏢",
        reputation: 4.9,
        totalInvested: 12500000,
        roi: 34.2,
        winRate: 91,
        avgHoldDays: 45,
        holdings: [
            { symbol: "oWHT", percentage: 40 },
            { symbol: "oBBL", percentage: 30 },
            { symbol: "oLNG", percentage: 20 },
            { symbol: "oCRN", percentage: 10 },
        ],
        completedEscrows: 23,
        disputes: 1,
        onTimeRate: 96,
        recentActivity: [
            {
                action: "📥",
                detail: "Invested $250K in oWHT-OC26 (M3)",
                time: "2h ago",
            },
            {
                action: "✅",
                detail: "Voted YES on oWHT-OC26 Milestone 3",
                time: "3h ago",
            },
            {
                action: "📤",
                detail: "Sold 12,000 oBBL @ $82.40",
                time: "1d ago",
            },
        ],
        memberSince: "Jan 2026",
    },
    {
        rank: 2,
        name: "PetroChem Ventures",
        wallet: "9aLm...4pQr",
        kycLevel: "Institutional",
        kycVerified: true,
        avatar: "🛢️",
        reputation: 4.7,
        totalInvested: 8300000,
        roi: 28.7,
        winRate: 87,
        avgHoldDays: 62,
        holdings: [
            { symbol: "oBBL", percentage: 55 },
            { symbol: "oLNG", percentage: 35 },
            { symbol: "oUREA", percentage: 10 },
        ],
        completedEscrows: 18,
        disputes: 0,
        onTimeRate: 100,
        recentActivity: [
            {
                action: "📥",
                detail: "Bought 50,000 oLNG @ $3.21",
                time: "5h ago",
            },
            {
                action: "🏆",
                detail: "Reached #2 on Leaderboard",
                time: "2d ago",
            },
        ],
        memberSince: "Feb 2026",
    },
    {
        rank: 3,
        name: "AgriTrade MENA",
        wallet: "3bNk...7sWx",
        kycLevel: "Institutional",
        kycVerified: true,
        avatar: "🌍",
        reputation: 4.6,
        totalInvested: 6100000,
        roi: 22.1,
        winRate: 83,
        avgHoldDays: 38,
        holdings: [
            { symbol: "oUREA", percentage: 45 },
            { symbol: "oAMN", percentage: 30 },
            { symbol: "oWHT", percentage: 25 },
        ],
        completedEscrows: 15,
        disputes: 2,
        onTimeRate: 87,
        recentActivity: [
            {
                action: "📥",
                detail: "Invested $100K in oUREA-D27",
                time: "1h ago",
            },
            {
                action: "📄",
                detail: "New project: Dubai Urea Export 2027",
                time: "1d ago",
            },
        ],
        memberSince: "Mar 2026",
    },
];

// ═══════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════

export function AgroConnect() {
    const [selectedTrader, setSelectedTrader] =
        useState<TraderProfile | null>(null);
    const [activeTab, setActiveTab] = useState<"leaderboard" | "feed" | "dividends">(
        "leaderboard"
    );
    const [feed, setFeed] = useState<any[]>([]);
    const [feedLoading, setFeedLoading] = useState(false);

    // Загружаем ленту
    const fetchFeed = async () => {
        setFeedLoading(true);
        try {
            const res = await fetch('/api/feed?source=all');
            const data = await res.json();
            setFeed(data.feed || []);
        } catch (error) {
            console.error('Feed fetch error:', error);
        } finally {
            setFeedLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'feed') {
            fetchFeed();
            // Автообновление каждые 30 секунд
            const interval = setInterval(fetchFeed, 30000);
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    const rankEmoji = (rank: number) =>
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

    return (
        <div className="agroconnect">
            <div className="agroconnect-header">
                <h2>🤝 AgroConnect — Social Trading Hub</h2>
                <p>
                    Discover top RWA traders, follow strategies, and build
                    trust in commodity markets
                </p>
            </div>

            {/* ── Tabs ── */}
            <div className="agroconnect-tabs">
                <button
                    className={`tab ${activeTab === "leaderboard" ? "active" : ""}`}
                    onClick={() => setActiveTab("leaderboard")}
                >
                    🏆 Leaderboard
                </button>
                <button
                    className={`tab ${activeTab === "feed" ? "active" : ""}`}
                    onClick={() => setActiveTab("feed")}
                >
                    📊 Activity Feed
                </button>
                <button
                    className={`tab ${activeTab === "dividends" ? "active" : ""}`}
                    onClick={() => setActiveTab("dividends")}
                >
                    💰 Dividends
                </button>
            </div>

            {/* ── Leaderboard Tab ── */}
            {activeTab === "leaderboard" && (
                <div className="leaderboard">
                    {MOCK_TRADERS.map((trader) => (
                        <div
                            key={trader.rank}
                            className="leaderboard-card"
                            onClick={() => setSelectedTrader(trader)}
                        >
                            <div className="leaderboard-rank">
                                {rankEmoji(trader.rank)}
                            </div>
                            <div className="leaderboard-avatar">
                                {trader.avatar}
                            </div>
                            <div className="leaderboard-info">
                                <h3>
                                    {trader.name}
                                    {trader.kycVerified && (
                                        <span className="kyc-badge">
                                            KYC ✅
                                        </span>
                                    )}
                                </h3>
                                <p>
                                    {trader.kycLevel} · Since{" "}
                                    {trader.memberSince}
                                </p>
                            </div>
                            <div className="leaderboard-stats">
                                <div className="lb-stat">
                                    <span className="lb-stat-value positive">
                                        +{trader.roi}%
                                    </span>
                                    <span className="lb-stat-label">
                                        ROI (90d)
                                    </span>
                                </div>
                                <div className="lb-stat">
                                    <span className="lb-stat-value">
                                        $
                                        {(trader.totalInvested / 1e6).toFixed(
                                            1
                                        )}
                                        M
                                    </span>
                                    <span className="lb-stat-label">
                                        Portfolio
                                    </span>
                                </div>
                                <div className="lb-stat">
                                    <span className="lb-stat-value">
                                        {trader.winRate}%
                                    </span>
                                    <span className="lb-stat-label">
                                        Win Rate
                                    </span>
                                </div>
                                <div className="lb-stat">
                                    <span className="lb-stat-value">
                                        ⭐ {trader.reputation}
                                    </span>
                                    <span className="lb-stat-label">
                                        Reputation
                                    </span>
                                </div>
                            </div>
                            <div className="leaderboard-holdings">
                                {trader.holdings.map((h) => (
                                    <span
                                        key={h.symbol}
                                        className="holding-pill"
                                    >
                                        {h.symbol} {h.percentage}%
                                    </span>
                                ))}
                            </div>
                            <div className="leaderboard-actions">
                                <button
                                    className="btn-copy-trade"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        alert("Copy Trading Feature Initiated!");
                                    }}
                                >
                                    📋 Copy Strategy
                                </button>
                                <button
                                    className="btn-follow"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        alert("You are now following " + trader.name);
                                    }}
                                >
                                    🔔 Follow
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Activity Feed Tab ── */}
            {activeTab === "feed" && (
                <div className="activity-feed">
                    {feedLoading ? (
                        <div className="feed-loading">Loading on-chain activity...</div>
                    ) : (
                        feed.length === 0 ? (
                            <div className="feed-empty">No activities found.</div>
                        ) : (
                            feed.map((item, i) => (
                                <div key={i} className="feed-item">
                                    <div className="feed-avatar">
                                        {item.action.includes('Vote') ? '🗳️' :
                                            item.action.includes('Released') ? '💰' :
                                                item.action.includes('Oracle') ? '🔮' : '🔄'}
                                    </div>
                                    <div className="feed-content">
                                        <span className="feed-action">{item.action}</span>
                                        <span className="feed-detail">{item.detail}</span>
                                        <span className="feed-time">
                                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Recently'}
                                        </span>
                                    </div>
                                    {item.explorerUrl && (
                                        <a
                                            href={item.explorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="feed-explorer-link"
                                        >
                                            🔍 Devnet
                                        </a>
                                    )}
                                </div>
                            ))
                        )
                    )}
                </div>
            )}

            {/* ── Dividends Tab ── */}
            {activeTab === "dividends" && <DividendsDashboard />}
            {selectedTrader && (
                <div
                    className="trader-modal-overlay"
                    onClick={() => setSelectedTrader(null)}
                >
                    <div
                        className="trader-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="modal-close"
                            onClick={() => setSelectedTrader(null)}
                        >
                            ✕
                        </button>

                        <div className="trader-modal-header">
                            <div className="trader-modal-avatar">
                                {selectedTrader.avatar}
                            </div>
                            <div>
                                <h2>{selectedTrader.name}</h2>
                                <p>
                                    {selectedTrader.wallet} ·{" "}
                                    {selectedTrader.kycLevel}
                                    {selectedTrader.kycVerified ? " ✅" : ""}
                                </p>
                            </div>
                        </div>

                        <div className="trader-modal-stats-grid">
                            <div className="tms">
                                <div className="tms-value">
                                    $
                                    {(
                                        selectedTrader.totalInvested / 1e6
                                    ).toFixed(1)}
                                    M
                                </div>
                                <div className="tms-label">Total Invested</div>
                            </div>
                            <div className="tms">
                                <div className="tms-value positive">
                                    +{selectedTrader.roi}%
                                </div>
                                <div className="tms-label">ROI (90 Days)</div>
                            </div>
                            <div className="tms">
                                <div className="tms-value">
                                    {selectedTrader.completedEscrows}
                                </div>
                                <div className="tms-label">Completed Escrows</div>
                            </div>
                            <div className="tms">
                                <div className="tms-value">
                                    {selectedTrader.onTimeRate}%
                                </div>
                                <div className="tms-label">On-Time Rate</div>
                            </div>
                            <div className="tms">
                                <div className="tms-value">
                                    {selectedTrader.disputes}
                                </div>
                                <div className="tms-label">Disputes</div>
                            </div>
                            <div className="tms">
                                <div className="tms-value">
                                    {selectedTrader.avgHoldDays}d
                                </div>
                                <div className="tms-label">Avg Hold Time</div>
                            </div>
                        </div>

                        <h3>Portfolio Allocation</h3>
                        <div className="portfolio-bars">
                            {selectedTrader.holdings.map((h) => (
                                <div
                                    key={h.symbol}
                                    className="portfolio-bar-item"
                                >
                                    <span className="portfolio-bar-label">
                                        {h.symbol}
                                    </span>
                                    <div className="portfolio-bar-track">
                                        <div
                                            className="portfolio-bar-fill"
                                            style={{
                                                width: `${h.percentage}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="portfolio-bar-percent">
                                        {h.percentage}%
                                    </span>
                                </div>
                            ))}
                        </div>

                        <h3>Recent Activity</h3>
                        <div className="trader-activity">
                            {selectedTrader.recentActivity.map((a, i) => (
                                <div key={i} className="trader-activity-item">
                                    <span>{a.action}</span>
                                    <span>{a.detail}</span>
                                    <span className="activity-time">
                                        {a.time}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="trader-modal-actions">
                            <button className="btn-copy-trade-lg">
                                📋 Copy This Strategy ($500K max)
                            </button>
                            <a
                                href="https://bags.fm"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-bags-lg"
                            >
                                View on Bags.fm
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
