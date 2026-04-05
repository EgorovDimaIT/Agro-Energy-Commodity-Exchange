// src/components/SimpleFundraising.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Bags.fm fundraising URL — update after mainnet launch
const BAGS_FUNDRAISING_URL = 'https://bags.fm/token/BZBvHcjsZJVKwLJSesCSe3CyVJubXWAsz7Yo6VQ2bSA1';

export function SimpleFundraising() {
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();

    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [investAmount, setInvestAmount] = useState('0.1');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [mounted, setMounted] = useState(false);

    const PROJECT_ID = 'owht-cairo-q3-2026';

    useEffect(() => {
        setMounted(true);
        fetchProject();
    }, []);

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/fundraising-simple/status?id=${PROJECT_ID}`);
            const data = await res.json();
            if (data.success) setProject(data.project);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvest = async () => {
        if (!publicKey) return setMessage('⚠️ Connect wallet first!');
        setProcessing(true);
        setMessage('🔨 Creating transaction...');

        try {
            const res = await fetch('/api/fundraising-simple/invest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: PROJECT_ID,
                    investorPublicKey: publicKey.toBase58(),
                    amountSOL: parseFloat(investAmount),
                }),
            });

            const data = await res.json();
            const transaction = Transaction.from(Buffer.from(data.transaction, 'base64'));
            const signature = await sendTransaction(transaction, connection);

            setMessage('⏳ Confirming in blockchain...');
            await connection.confirmTransaction(signature, 'confirmed');

            await fetch('/api/fundraising-simple/invest', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: PROJECT_ID,
                    investorPublicKey: publicKey.toBase58(),
                    amountSOL: parseFloat(investAmount),
                    txSignature: signature,
                }),
            });

            setMessage(`🎉 Success! Invested ${investAmount} SOL!`);
            fetchProject();
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading fundraising...</div>;
    if (!project) return <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Project not found. Run init script.</div>;

    const progressPercent = Math.min((project.raisedSOL / project.targetSOL) * 100, 100);

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                    <h2 style={{ color: '#00ffa3', fontSize: '22px', margin: 0 }}>🌾 {project.name}</h2>
                    <p style={{ color: '#888', fontSize: '13px', marginTop: '8px', maxWidth: '500px' }}>{project.description}</p>
                </div>
                <span style={{ fontSize: '10px', background: '#1a1a2e', padding: '4px 10px', borderRadius: '20px', color: '#00ffa3', border: '1px solid rgba(0,255,163,0.2)' }}>
                    DEVNET • LIVE
                </span>
            </div>

            {/* ══════ BAGS.FM CTA BUTTON ══════ */}
            <a
                href={BAGS_FUNDRAISING_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '16px',
                    background: 'linear-gradient(135deg, #8c52ff 0%, #5e17eb 50%, #00ffa3 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'bagsBtnGlow 3s ease infinite',
                    boxShadow: '0 4px 20px rgba(140, 82, 255, 0.35)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(140, 82, 255, 0.5)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(140, 82, 255, 0.35)';
                }}
            >
                <span style={{ fontSize: '22px' }}>🛍️</span>
                <span>Invest on Bags.fm — Buy $AGRO</span>
                <span style={{ fontSize: '14px', opacity: 0.8 }}>↗</span>
            </a>

            {/* Progress */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    <span>Raised</span>
                    <span>Target</span>
                </div>
                <div style={{ height: '10px', background: '#1a1a2e', borderRadius: '5px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00ffa3, #03e1ff)',
                        borderRadius: '5px',
                        transition: 'width 0.5s ease',
                    }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ fontWeight: 700 }}>{project.raisedSOL.toFixed(2)} SOL</span>
                    <span style={{ color: '#00ffa3', fontWeight: 700 }}>{progressPercent.toFixed(0)}%</span>
                    <span style={{ color: '#888' }}>{project.targetSOL} SOL</span>
                </div>
            </div>

            {/* Direct Invest (Devnet Escrow) */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ccc' }}>💰 Direct Invest (Devnet Escrow)</h3>
                {!mounted ? (
                    <div style={{ height: '40px' }} />
                ) : !publicKey ? (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Connect Phantom wallet to invest directly</p>
                        <WalletMultiButton />
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="number"
                                step="0.1"
                                value={investAmount}
                                onChange={e => setInvestAmount(e.target.value)}
                                disabled={processing}
                                style={{ flex: 1, background: '#1a1a2e', border: '1px solid #333', color: '#fff', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}
                            />
                            <button
                                onClick={handleInvest}
                                disabled={processing}
                                style={{
                                    background: '#00ffa3',
                                    color: '#000',
                                    fontWeight: 700,
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: processing ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    opacity: processing ? 0.6 : 1,
                                }}
                            >
                                {processing ? '⏳ ...' : `Pay ${investAmount} SOL`}
                            </button>
                        </div>
                        {message && <div style={{ marginTop: '10px', fontSize: '12px', color: '#00ffa3' }}>{message}</div>}
                    </div>
                )}
            </div>

            {/* Milestones */}
            <div>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ccc' }}>📋 Milestone DAO</h3>
                {project.milestones.map((m: any) => (
                    <div key={m.index} style={{
                        marginBottom: '8px',
                        padding: '10px 14px',
                        borderLeft: `3px solid ${m.status === 'oracle_confirmed' ? '#00ffa3' : '#333'}`,
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '0 8px 8px 0',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px' }}>M{m.index + 1}: {m.title}</span>
                            <span style={{
                                fontSize: '9px',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: m.status === 'oracle_confirmed' ? 'rgba(0,255,163,0.1)' : 'rgba(255,255,255,0.05)',
                                color: m.status === 'oracle_confirmed' ? '#00ffa3' : '#666',
                            }}>
                                {m.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{m.amountSOL} SOL ({m.percentage}%)</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
