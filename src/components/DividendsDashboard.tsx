// src/components/DividendsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function DividendsDashboard() {
    const { publicKey } = useWallet();
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchPreview();
    }, []);

    const fetchPreview = async () => {
        try {
            const res = await fetch('/api/dividends/preview');
            const data = await res.json();
            if (data.success) setPreview(data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDistribute = async () => {
        setLoading(true);
        setMessage('💸 Distributing dividends...');
        try {
            const res = await fetch('/api/dividends/distribute', {
                method: 'POST',
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ ${data.message}`);
                fetchPreview();
            } else {
                setMessage(`❌ ${data.message || data.error}`);
            }
        } catch (error) {
            setMessage('❌ Distribution failed');
        } finally {
            setLoading(false);
        }
    };

    // Найти выплату для текущего кошелька
    const myPayout = preview?.payouts?.find(
        (p: any) => p.wallet === publicKey?.toBase58()
    );

    return (
        <div className="dividends-dashboard">
            <h2>💰 Dividend Center</h2>
            <p>Real SOL rewards for $AGRO holders, every 24 hours</p>

            {/* Pool Info */}
            {preview && (
                <div className="pool-stats">
                    <div className="pool-stat">
                        <span className="pool-stat-value">
                            {preview.poolBalance?.toFixed(4)} SOL
                        </span>
                        <span className="pool-stat-label">Vault Balance</span>
                    </div>
                    <div className="pool-stat">
                        <span className="pool-stat-value">
                            {preview.toDistribute?.toFixed(4)} SOL
                        </span>
                        <span className="pool-stat-label">To Distribute</span>
                    </div>
                    <div className="pool-stat">
                        <span className="pool-stat-value">{preview.holdersCount}</span>
                        <span className="pool-stat-label">Eligible Holders</span>
                    </div>
                </div>
            )}

            {/* Your Payout */}
            {myPayout && (
                <div className="my-payout-card">
                    <h3>🎯 Your Upcoming Dividend</h3>
                    <div className="payout-amount">{myPayout.solAmount.toFixed(6)} SOL</div>
                    <div className="payout-share">Your share: {myPayout.share}</div>
                </div>
            )}

            {/* Holders Table */}
            {preview?.payouts && (
                <div className="holders-table">
                    <h3>📊 Top Holders & Payouts</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Wallet</th>
                                <th>Share</th>
                                <th>Payout (SOL)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.payouts.slice(0, 10).map((p: any, i: number) => (
                                <tr
                                    key={p.wallet}
                                    className={p.wallet === publicKey?.toBase58() ? 'highlighted' : ''}
                                >
                                    <td>#{i + 1}</td>
                                    <td>
                                        {p.wallet.slice(0, 6)}...{p.wallet.slice(-4)}
                                        {p.wallet === publicKey?.toBase58() && ' (You)'}
                                    </td>
                                    <td>{p.share}</td>
                                    <td>{p.solAmount.toFixed(6)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Distribute Button (only for admin) */}
            <div className="distribute-section">
                <button
                    className="btn-distribute"
                    onClick={handleDistribute}
                    disabled={loading}
                >
                    {loading ? '⏳ Distributing...' : '🚀 Distribute Dividends (Demo)'}
                </button>
                {message && (
                    <div className={`distribute-message ${message.includes('✅') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
            </div>

            <style jsx>{`
        .dividends-dashboard {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 2rem;
          margin-top: 2rem;
          color: #fff;
        }
        .pool-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin: 1.5rem 0;
        }
        .pool-stat {
          background: rgba(255, 255, 255, 0.05);
          padding: 1rem;
          border-radius: 12px;
          text-align: center;
        }
        .pool-stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
          color: #00d4aa;
        }
        .pool-stat-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .my-payout-card {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.2), rgba(0, 163, 136, 0.2));
          border: 1px solid rgba(0, 212, 170, 0.4);
          padding: 1.5rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          text-align: center;
        }
        .payout-amount {
          font-size: 2rem;
          font-weight: bold;
          color: #00d4aa;
          margin: 0.5rem 0;
        }
        .holders-table table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        .holders-table th {
          text-align: left;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8rem;
          padding: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .holders-table td {
          padding: 0.75rem 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .highlighted {
          background: rgba(0, 212, 170, 0.1);
        }
        .distribute-section {
          margin-top: 2rem;
          text-align: center;
        }
        .btn-distribute {
          background: #00d4aa;
          color: #000;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-distribute:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
        }
        .distribute-message {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
        }
        .distribute-message.success {
          background: rgba(0, 212, 170, 0.1);
          color: #00d4aa;
        }
        .distribute-message.error {
          background: rgba(255, 77, 77, 0.1);
          color: #ff4d4d;
        }
      `}</style>
        </div>
    );
}
