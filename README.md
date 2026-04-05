# 🏦 Agro-Energy Commodity Exchange
### Institutional RWA Vault & B2B Escrow Network on Solana

**StableHacks 2026 Hackathon Submission**  
**Track:** RWA-Backed Stablecoin & Commodity Vaults / Institutional Permissioned DeFi Vaults

---

## 🌍 Vision

Global B2B commodity trading is plagued by extreme fragmentation, slow cross-border settlements, exorbitant bank escrow fees, and a severe lack of transparency. Traditional DeFi cannot be adopted by institutional players due to strict regulatory constraints (missing KYC, AML, and FATF Travel Rule compliance).

We bridge this gap by building an **Institutional-Grade Permissioned DeFi Vault** on **Solana**. Our platform tokenizes critical Real-World Assets (RWAs) and enables autonomous, cryptographically secure B2B escrow settlements connected to real-world logistics oracles.

---

## 🚨 The Problems We Solve

| Problem | Traditional Finance | Our Solution |
|---------|-------------------|--------------|
| Slow B2B Trade Finance | Letters of Credit take days, high fees | On-chain escrow with sub-second finality |
| No DeFi Compliance | Anonymous protocols | Whitelisted KYC/AML/KYT ecosystem |
| Opaque Supply Chains | No real-time visibility | Oracle-verified logistics tracking |
| Fragmented Commodities | Paper-based warehouse receipts | Tokenized 1:1 backed digital assets |

---

## 💡 The Solution

1. **Tokenized RWA Vaults** — High-value commodities stored in verified physical locations, each represented by a digital token backed 1:1 by audited reserves.
2. **Regulated On-Chain Escrow** — Buyers lock stablecoins into decentralized vaults. Funds unlock only when a **Logistics Oracle** confirms physical delivery.
3. **Milestone DAO Governance** — Crowdfunding investments are released in stages, with DAO voting on each milestone before fund disbursement.
4. **Live Oracle Pricing** — Assets dynamically priced via real-time data feeds with visual sparkline analytics.

---

## 🪙 Bags.fm Integration & Token Launch Platform

Our platform integrates with **[Bags.fm](https://bags.fm)** — the Solana-native token launch platform — for real crowdfunding and token distribution.

### How It Works:
- **$AGRO** governance token is the entry point for investors
- Buying $AGRO on Bags.fm = investing in the Agro-Energy ecosystem
- Token holders get governance voting rights on milestone releases
- Trading fees are distributed via Bags.fm fee-sharing to the team and treasury
- Tiered access system (Bronze → Silver → Gold → Whale) based on $AGRO holdings

### Bags.fm Features Used:
- ✅ Token Launch via bonding curve
- ✅ Fee sharing configuration (creator revenue split)
- ✅ Token-gated access (BagsAccessGate component)
- ✅ Fee dashboard for tracking lifetime revenue

---

## 🔗 Deployed Tokens on Solana Devnet

All 7 tokens have been created and deployed on **Solana Devnet** with full SPL metadata:

| # | Token | Symbol | Mint Address | Commodity |
|---|-------|--------|-------------|-----------|
| 1 | **Agro-Energy Governance** | `$AGRO` | `BZBvHcjsZJVKwLJSesCSe3CyVJubXWAsz7Yo6VQ2bSA1` | Governance & Access |
| 2 | **Tokenized Brent Crude Oil** | `$oBBL` | `AMcvp9aMSq9FMmp2SJcBQ7enPFjPfnF9vufKTmQZvW1q` | 800,000 BBL — Rotterdam, NL |
| 3 | **Tokenized Wheat Grade 1** | `$oWHT` | `8wtq4HJdXsi42pXECxQg3S9xPeqQXyHk6JXD3CC4whH` | 550,000 MT — Odesa, UA |
| 4 | **Tokenized LNG** | `$oLNG` | `FTgMMkbm5UJWKVX8UoLi9YTg1abNrwqo8XZZdUmX7Yp9` | 600,000 MMBtu — Houston, US |
| 5 | **Tokenized Corn Grade 1** | `$oCRN` | `DeCsKqWw69oEKECrZnDWeUdZrQUdLcedsSu4o1YKAbem` | 720,000 MT — Houston, US |
| 6 | **Tokenized Urea Fertilizer** | `$oUREA` | `ALTt561pzUSaND8JE7oZKr4UUxQCWUyVKkFGKXVKQNbg` | 400,000 MT — Jebel Ali, AE |
| 7 | **Tokenized Ammonium Nitrate** | `$oAMN` | `EQ4mHJ5UFiYBGV8RfQ5i5cZ2K46uxRddNQsRyVBGzL1p` | 350,000 MT — Antwerp, BE |

> **Verify on Solscan:** `https://solscan.io/token/<MINT_ADDRESS>?cluster=devnet`

### Escrow Wallet
| Role | Address |
|------|---------|
| Fundraising Escrow | `FJwqsC4y6dT6yLy4XQZEaAjzDEWbXkiJxJi6BfGS5naf` |
| Creator Wallet | `bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Dashboard │ │AgroFund  │ │AgroConnect│ │Fee Sharing    │  │
│  │          │ │Fundraise │ │Social Hub │ │Dashboard      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       │             │            │               │           │
│  ┌────▼─────────────▼────────────▼───────────────▼────────┐ │
│  │              Solana Wallet Adapter (Phantom)            │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │     SOLANA DEVNET         │
              │  ┌─────────────────────┐  │
              │  │ SPL Token Program   │  │
              │  │ 7 RWA Tokens        │  │
              │  │ Escrow Wallet       │  │
              │  └─────────────────────┘  │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │     BAGS.FM (MAINNET)     │
              │  • Token Launch Platform  │
              │  • Bonding Curve          │
              │  • Fee Sharing Engine     │
              │  • Crowdfunding           │
              └───────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Solana (sub-second finality, ultra-low fees) |
| **Wallet** | Phantom via `@solana/wallet-adapter-react` |
| **Token Standard** | SPL Token with Metaplex metadata |
| **Frontend** | Next.js 14 + React 18 (App Router) |
| **Token Launch** | Bags.fm SDK (`@bagsfm/bags-sdk`) |
| **Oracle** | Custom Node.js logistics oracle + AIS tracking |
| **Styling** | Vanilla CSS with Glassmorphism design system |
| **Charts** | Zero-dependency SVG sparklines (real-time) |

---

## 📦 Supported Tokenized Assets (MVP)

| Asset | Token | Quantity | Storage Location | Oracle Feed |
|-------|-------|----------|-----------------|-------------|
| 🛢️ Brent Crude Oil | `oBBL` | 800,000 BBL | Port of Rotterdam, NL | ICE Futures |
| ⚡ Liquefied Natural Gas | `oLNG` | 600,000 MMBtu | Port of Houston, US | Henry Hub NYMEX |
| 🌾 Wheat Grade 1 | `oWHT` | 550,000 MT | Port of Odesa, UA | CBOT Wheat (W) |
| 🌽 Corn Grade 1 | `oCRN` | 720,000 MT | Port of Houston, US | CBOT Corn (C) |
| 🧪 Urea Fertilizer | `oUREA` | 400,000 MT | Jebel Ali Port, AE | Fertecon Index |
| 💎 Ammonium Nitrate | `oAMN` | 350,000 MT | Port of Antwerp, BE | ICIS AN Index |

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/EgorovDimaIT/Agro-Exchange-Bugs.git
cd Agro-Exchange-Bugs

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your BAGS_API_KEY, PRIVATE_KEY, and token mints

# Run development server
npm run dev

# Open http://localhost:3000
```

### Scripts

```bash
# Create Devnet tokens
node scripts/create_devnet_commodity_tokens.js

# Initialize fundraising DB
node scripts/init_fundraising_simple.js

# Launch on Bags.fm (requires Mainnet SOL)
node scripts/launch_bags_fundraising.js
```

---

## 🌾 Crowdfunding: Odesa-Cairo Wheat Corridor

Our flagship fundraising project demonstrates the full RWA pipeline:

- **Route:** Odesa 🇺🇦 → Cairo 🇪🇬
- **Commodity:** 50,000 MT Wheat Grade 1 (GAFTA certified)
- **Target:** 5 SOL (Devnet demo)
- **Milestones:** 5-stage DAO governance with oracle verification

| Milestone | Amount | Stage |
|-----------|--------|-------|
| Contract Signing & Insurance | 0.5 SOL (10%) | ✅ Oracle Confirmed |
| Warehouse Verification & Audit | 1.0 SOL (20%) | 🔒 Locked |
| Loading & Ship Departure | 1.5 SOL (30%) | 🔒 Locked |
| In-Transit Oracle Confirmation | 1.0 SOL (20%) | 🔒 Locked |
| Final Delivery & Settlement | 1.0 SOL (20%) | 🔒 Locked |

---

## 📄 License

MIT License — Built with ❤️ at StableHacks 2026

> *The Future of TradiFi × DeFi starts here.*
