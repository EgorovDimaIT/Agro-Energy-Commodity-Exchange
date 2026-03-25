"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2,
    LayoutDashboard,
    ShieldCheck,
    Handshake,
    Database,
    Wallet,
    Globe2,
    CheckCircle2,
    Truck,
    LineChart
} from 'lucide-react';

// Virtual Companies
const COMPANIES = [
    { id: 1, name: "Global Oil Trader Ltd", role: "Exporter", address: "0x192...A3B9", kyc: "Verified", flag: "🌍" },
    { id: 2, name: "EuroGas Energy Corp", role: "Importer", address: "0x48A...F920", kyc: "Verified", flag: "🇪🇺" },
    { id: 3, name: "AgriFertilizer Group", role: "Exporter", address: "0x78D...11CE", kyc: "Verified", flag: "🌱" },
    { id: 4, name: "Alpha PetroChemicals", role: "Importer", address: "0x3B2...C871", kyc: "Pending", flag: "⚡" },
];

// Initial RWA Assets details
const ASSETS_DATA = [
    { id: 'oil', token: 'oBBL', name: 'Brent Crude Oil', quantity: '800,000 BBL', location: 'Port of Rotterdam, Netherlands', basePrice: 82.50, color: '#f59e0b' },
    { id: 'gas', token: 'oLNG', name: 'Liquefied Natural Gas', quantity: '600,000 MMBtu', location: 'Port of Houston, USA', basePrice: 2.85, color: '#0ea5e9' },
    { id: 'urea', token: 'oUREA', name: 'Urea Fertilizer', quantity: '400,000 MT', location: 'Jebel Ali Port, UAE', basePrice: 345.00, color: '#8c52ff' },
    { id: 'nitrate', token: 'oAMN', name: 'Ammonium Nitrate', quantity: '350,000 MT', location: 'Port of Antwerp, Belgium', basePrice: 290.00, color: '#00e676' },
    { id: 'wheat', token: 'oWHT', name: 'Wheat (Grade 1)', quantity: '550,000 MT', location: 'Port of Odesa, Ukraine', basePrice: 225.50, color: '#fbbf24' },
    { id: 'corn', token: 'oCRN', name: 'Corn (Grade 1)', quantity: '720,000 MT', location: 'Port of Houston, USA', basePrice: 198.20, color: '#fcd34d' },
];

export default function MetaMaskEscrowApp() {
    const [activeTab, setActiveTab] = useState('Assets');
    const [wallet, setWallet] = useState<string | null>(null);

    const connectMetaMask = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length > 0) setWallet(accounts[0]);
            } catch (err) {
                console.error("User rejected request");
            }
        } else {
            alert("Please install MetaMask!");
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard': return <DashboardTab />;
            case 'KYC': return <KycTab />;
            case 'Deals': return <DealsTab />;
            case 'Assets': return <AssetsTab />;
            default: return <DashboardTab />;
        }
    }

    return (
        <div className="app-layout">
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="logo-container">
                    <Building2 color="#8c52ff" />
                    StableHacks
                </div>

                <nav className="nav-menu">
                    {[
                        { id: 'Dashboard', icon: LayoutDashboard },
                        { id: 'KYC', icon: ShieldCheck },
                        { id: 'Deals', icon: Handshake },
                        { id: 'Assets', icon: Database }
                    ].map(item => (
                        <div
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <item.icon size={20} />
                            {item.id === 'Assets' ? 'Inventory & Markets' : item.id}
                        </div>
                    ))}
                </nav>

                <div className="wallet-section">
                    {!wallet ? (
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={connectMetaMask}>
                            <Wallet size={16} />
                            Connect MetaMask
                        </button>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div className="badge badge-verified" style={{ marginBottom: '10px' }}>
                                <CheckCircle2 size={12} /> Connected EVM
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', wordBreak: 'break-all' }}>
                                {wallet}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>
                            {activeTab === 'Assets' ? 'Tokenized Assets & Markets' : activeTab}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Institutional B2B Escrow Network for Commodities</p>
                    </div>
                </header>

                {renderContent()}
            </main>
        </div>
    );
}

// ============== TABS ==============

function DashboardTab() {
    return (
        <div className="glass-panel">
            <h2>Network Overview</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Real-time statistics of the B2B Commodity Vault ecosystem.</p>

            <div className="grid-2">
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '12px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>Total Volume Locked (TVL)</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-color)' }}>$24.5M USDC</div>
                    <div style={{ color: 'var(--success-color)', fontSize: '12px', marginTop: '10px' }}>+12% this week</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '12px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>Active Deals in Transit</div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold' }}>14</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '10px' }}>Waiting for Logistics Oracle</div>
                </div>
            </div>
        </div>
    );
}

function KycTab() {
    return (
        <div>
            <div className="glass-panel">
                <h2 style={{ marginBottom: '20px' }}>Verified Counterparties</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                    Virtual Exporters & Importers registered on the network. Only verified addresses can participate in B2B Escrow.
                </p>

                {COMPANIES.map(company => (
                    <div className="company-card" key={company.id}>
                        <div>
                            <div className="company-name">
                                {company.flag} {company.name}
                            </div>
                            <div className="company-role">{company.role}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div className="company-address">{company.address}</div>
                            <div className={`badge ${company.kyc === 'Verified' ? 'badge-verified' : 'badge-pending'}`}>
                                {company.kyc === 'Verified' ? <ShieldCheck size={12} /> : <ShieldCheck size={12} color="var(--warning-color)" />}
                                {company.kyc}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DealsTab() {
    const [dealStatus, setDealStatus] = useState<'IDLE' | 'LOCKED' | 'DELIVERED'>('IDLE');

    const onStart = () => setDealStatus('LOCKED');

    return (
        <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2>Active Smart Contracts</h2>
                <button className="btn btn-primary" onClick={onStart} disabled={dealStatus !== 'IDLE'}>
                    Initiate New Deal
                </button>
            </div>

            {dealStatus === 'IDLE' && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Globe2 size={48} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                    <p>No active escrows. Select an asset and counterparty to begin.</p>
                </div>
            )}

            {dealStatus === 'LOCKED' && (
                <div style={{ border: '1px solid var(--surface-border)', borderRadius: '12px', padding: '24px', background: 'rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3>ESC-998: oBBL Export to EuroGas</h3>
                        <span className="badge badge-pending">Funds Locked ($150,000)</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                        USDC is safely locked in the smart contract. Waiting for physical delivery confirmation to release funds automatically.
                    </p>
                    <button className="btn btn-secondary" onClick={() => setDealStatus('DELIVERED')}>
                        <Truck size={16} /> Fake Oracle: Trigger Logistics Delivery
                    </button>
                </div>
            )}

            {dealStatus === 'DELIVERED' && (
                <div style={{ border: '1px solid var(--success-color)', borderRadius: '12px', padding: '24px', background: 'var(--success-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--success-color)' }}>ESC-998: oBBL Export to EuroGas</h3>
                        <span className="badge badge-verified">Delivered & Paid</span>
                    </div>
                    <p style={{ color: '#fff', fontSize: '14px' }}>
                        The logistics API successfully confirmed delivery. Escrow unlocked and USDC sent to Exporter.
                    </p>
                </div>
            )}
        </div>
    );
}

// ============== CHARTS AND ASSETS TABS ==============

// Sparkline SVG Component
function Sparkline({ data, color }: { data: number[], color: string }) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 200;
    const height = 40;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0px 4px 6px ${color}40)` }}
            />
        </svg>
    );
}

function AssetsTab() {
    // Simulate live price feeds
    const [prices, setPrices] = useState<Record<string, number[]>>(() => {
        const init: Record<string, number[]> = {};
        ASSETS_DATA.forEach(asset => {
            // populate with 20 historical mock data points
            init[asset.id] = Array.from({ length: 20 }, () => asset.basePrice * (1 + (Math.random() - 0.5) * 0.05));
            init[asset.id].push(asset.basePrice);
        });
        return init;
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setPrices(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    const currentHistory = next[key];
                    const lastPrice = currentHistory[currentHistory.length - 1];
                    // simulate a random market tick (up or down by max 1.5%)
                    const change = lastPrice * ((Math.random() - 0.5) * 0.03);
                    const newPrice = lastPrice + change;

                    // keep last 20 points
                    next[key] = [...currentHistory.slice(1), newPrice];
                });
                return next;
            });
        }, 1500); // Ticks every 1.5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2>Assets Inventory & Markets</h2>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--success-color)', fontSize: '14px', alignItems: 'center' }}>
                    <LineChart size={18} /> LIVE ORACLE FEED
                </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                Tokenized Real World Assets currently available in the Vault network. Connected to verified physical storage locations.
            </p>

            <div style={{ display: 'grid', gap: '20px' }}>
                {ASSETS_DATA.map(asset => {
                    const history = prices[asset.id];
                    const currentPrice = history[history.length - 1];
                    const prevPrice = history[history.length - 2];
                    const isUp = currentPrice >= prevPrice;

                    return (
                        <div key={asset.id} style={{
                            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px',
                            padding: '24px', background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px', border: '1px solid var(--surface-border)'
                        }}>

                            {/* Info Column */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '18px', color: asset.color }}>{asset.token}</span>
                                    <span style={{ fontWeight: 600, fontSize: '16px' }}>{asset.name}</span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span><strong style={{ color: '#fff' }}>Location:</strong> {asset.location}</span>
                                    <span><strong style={{ color: '#fff' }}>Tokenized Supply:</strong> {asset.quantity}</span>
                                </div>
                            </div>

                            {/* Chart Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px' }}>
                                <Sparkline data={history} color={isUp ? 'var(--success-color)' : 'var(--danger-color)'} />
                            </div>

                            {/* Price Column */}
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase' }}>Current Price</div>
                                <div style={{
                                    fontWeight: 'bold',
                                    fontSize: '24px',
                                    color: isUp ? 'var(--success-color)' : 'var(--danger-color)',
                                    transition: 'color 0.3s ease'
                                }}>
                                    ${currentPrice.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Oracle Tick: {isUp ? '▲' : '▼'} {Math.abs(((currentPrice - prevPrice) / prevPrice) * 100).toFixed(2)}%
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    )
}
