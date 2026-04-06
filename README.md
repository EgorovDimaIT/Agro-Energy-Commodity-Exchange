# � Agro-Energy RWA Exchange
### Tokenized Commodity Trading & Crowdfunding Platform on Solana × Bags.fm


---

## � What Is This?

**Agro-Energy RWA Exchange** is a full-stack platform that lets anyone **invest in real-world agricultural commodity corridors** through tokenized assets on Solana. We use **Bags.fm** as the primary crowdfunding and token distribution engine, turning every $AGRO token purchase into a real investment in commodity logistics.

### The Core Idea
Traditional commodity trading is dominated by banks and brokers. We tokenize the process:

1. **Creator launches $AGRO on Bags.fm** → bonding curve fundraising
2. **Investors buy $AGRO** → funds flow into RWA commodity projects
3. **Milestone DAO** → investors vote on fund release at each logistics stage
4. **Oracle verification** → real shipping data (AIS tracking) confirms delivery
5. **Fee sharing** → Bags.fm 1% trading fee is distributed back to the creator team

---

## �️ Bags.fm Integration (Deep)

This project is built **on top of Bags.fm** as its core financial infrastructure:

### What We Use From Bags

| Bags Feature | How We Use It |
|-------------|--------------|
| **Token Launch** | $AGRO governance token launched via `sdk.tokenLaunch.createLaunchTransaction()` with bonding curve |
| **Fee Sharing** | Creator fee (1% on every trade) distributed via `sdk.config.createBagsFeeShareConfig()` — 70% team, 20% treasury, 10% community |
| **Bags SDK** | `@bagsfm/bags-sdk` integrated throughout — token info, metadata, fee tracking |
| **Token-Gated Access** | `BagsAccessGate` component checks $AGRO balance on-chain to gate premium features |
| **Fee Dashboard** | Real-time dashboard showing lifetime fees earned from Bags trading activity |
| **Token Page** | Direct link to `bags.fm/token/{mint}` — users buy $AGRO directly on Bags |

### Bags SDK Usage in Code

```typescript
// Token Launch (scripts/launch_bags_fundraising.js)
const sdk = new BagsSDK(API_KEY, connection, 'confirmed');
const tokenInfo = await sdk.tokenLaunch.createTokenInfoAndMetadata({
    name: 'Agro-Energy RWA Fund',
    symbol: 'AGRO',
    description: 'Governance token for RWA commodity exchange',
    imageUrl: '...',
});
const configResult = await sdk.config.createBagsFeeShareConfig({
    payer: keypair.publicKey,
    baseMint: new PublicKey(tokenInfo.tokenMint),
    feeClaimers: [{ user: creatorWallet, userBps: 10000 }],
});
const launchTx = await sdk.tokenLaunch.createLaunchTransaction({
    metadataUrl: tokenInfo.tokenMetadata,
    tokenMint: new PublicKey(tokenInfo.tokenMint),
    launchWallet: keypair.publicKey,
    initialBuyLamports: 0.01 * 1e9,
    configKey: configResult.meteoraConfigKey,
});

// Token-Gated Access (src/components/BagsAccessGate.tsx)
// Checks on-chain SPL balance to grant/deny access to features
const result = await checkTokenBalance(walletAddress, tokenMint);
if (result.balance >= minBalance) grantAccess();

// Fee Dashboard (src/components/BagsFeeDashboard.tsx)
const fees = await bagsApiFetch(`/token-launch/lifetime-fees?tokenMint=${mint}`);
```

### Bags Fee Distribution Model

```
Every $AGRO trade on Bags.fm generates 1% fee:

   Trade Fee (1%)
        │
        ├── 70% → Creator Team (operations, logistics)
        ├── 20% → Treasury (future commodity projects)  
        └── 10% → Community (airdrops, rewards)
```

---

## 🔗 Deployed Tokens on Solana Devnet

All 7 RWA commodity tokens deployed on **Solana Devnet**:

| Token | Symbol | Mint Address | Asset |
|-------|--------|-------------|-------|
| **Agro-Energy Governance** | `$AGRO` | `BZBvHcjsZJVKwLJSesCSe3CyVJubXWAsz7Yo6VQ2bSA1` | Governance & Access |
| **Brent Crude Oil** | `$oBBL` | `AMcvp9aMSq9FMmp2SJcBQ7enPFjPfnF9vufKTmQZvW1q` | 800K BBL — Rotterdam |
| **Wheat Grade 1** | `$oWHT` | `8wtq4HJdXsi42pXECxQg3S9xPeqQXyHk6JXD3CC4whH` | 550K MT — Odesa |
| **Liquefied Natural Gas** | `$oLNG` | `FTgMMkbm5UJWKVX8UoLi9YTg1abNrwqo8XZZdUmX7Yp9` | 600K MMBtu — Houston |
| **Corn Grade 1** | `$oCRN` | `DeCsKqWw69oEKECrZnDWeUdZrQUdLcedsSu4o1YKAbem` | 720K MT — Houston |
| **Urea Fertilizer** | `$oUREA` | `ALTt561pzUSaND8JE7oZKr4UUxQCWUyVKkFGKXVKQNbg` | 400K MT — Jebel Ali |
| **Ammonium Nitrate** | `$oAMN` | `EQ4mHJ5UFiYBGV8RfQ5i5cZ2K46uxRddNQsRyVBGzL1p` | 350K MT — Antwerp |

> Verify any token: `https://solscan.io/token/<MINT_ADDRESS>?cluster=devnet`

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                      │
│                                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ Dashboard  │ │ AgroFund   │ │AgroConnect │ │Fee Sharing │ │
│  │ Live Prices│ │ Crowdfund  │ │Social Hub  │ │ Dashboard  │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ │
│        └───────────────┼──────────────┼──────────────┘        │
│                        │              │                        │
│              ┌─────────▼──────────────▼─────────┐             │
│              │    Phantom Wallet Adapter         │             │
│              │    (Solana wallet-adapter-react)   │             │
│              └──────────────┬────────────────────┘             │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                 ┌────────────▼────────────┐
                 │      SOLANA DEVNET      │
                 │  • 7 SPL Tokens         │
                 │  • Escrow Wallet        │
                 │  • Milestone State      │
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │    BAGS.FM (MAINNET)    │
                 │  • Token Launch         │
                 │  • Bonding Curve        │
                 │  • Fee Sharing          │
                 │  • Creator Revenue      │
                 └─────────────────────────┘
```

---

## ✨ Key Features

### 1. Bags.fm Crowdfunding
- One-click "**Invest on Bags.fm — Buy $AGRO**" button in dashboard
- Bonding curve pricing — early investors get better rates
- Fee sharing automatically distributes trading revenue to team

### 2. Token-Gated Access Tiers
| Tier | Min $AGRO | Access |
|------|----------|--------|
| 🥉 Bronze | 1 | Market view |
| 🥈 Silver | 100 | Trade oWHT, oCRN |
| 🥇 Gold | 1,000 | All assets, Escrow up to $50K |
| 🏆 Whale | 10,000 | VIP, No Escrow Limit |

### 3. Milestone DAO Governance
Funds released in stages — investors vote at each checkpoint:
- M1: Contract Signing & Insurance (10%)
- M2: Warehouse Verification & Audit (20%)
- M3: Loading & Ship Departure (30%)
- M4: In-Transit Oracle Confirmation (20%)
- M5: Final Delivery & Settlement (20%)

### 4. Real-Time Market Dashboard
- Live SVG sparkline charts (zero dependencies)
- Oracle price feeds for 6 commodity tokens
- Simulated tick-by-tick market data

### 5. Social Trading Hub (AgroConnect)
- Trader leaderboard with performance tracking
- Copy-trading signals
- Token-gated premium features via BagsAccessGate

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Solana (Devnet + Mainnet via Bags) |
| **Token Launch** | Bags.fm SDK (`@bagsfm/bags-sdk v1.3.5`) |
| **Wallet** | Phantom via `@solana/wallet-adapter-react` |
| **Tokens** | SPL Token + Metaplex metadata |
| **Frontend** | Next.js 14 + React 18 |
| **Oracle** | Custom logistics oracle + AIS vessel tracking |
| **Styling** | Vanilla CSS, Glassmorphism design system |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/EgorovDimaIT/Agro-Exchange-Bugs.git
cd Agro-Exchange-Bugs

# Install
npm install

# Configure (add your keys)
cp .env.example .env.local

# Run
npm run dev
# Open http://localhost:3000
```

### Key Scripts
```bash
node scripts/create_devnet_commodity_tokens.js   # Deploy 7 tokens on Devnet
node scripts/init_fundraising_simple.js          # Initialize fundraising DB
node scripts/launch_bags_fundraising.js          # Launch $AGRO on Bags.fm (Mainnet)
```

---

## 📂 Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── layout.tsx                # Solana Provider wrapper
│   │   ├── bags-styles.css           # Bags-themed UI styles
│   │   └── api/
│   │       ├── fundraising-simple/   # Invest & status endpoints
│   │       ├── vote/                 # DAO voting
│   │       ├── milestone/            # Oracle & release
│   │       ├── dividends/            # Fee distribution
│   │       └── tokens/               # Token specs
│   ├── components/
│   │   ├── SimpleFundraising.tsx     # 🛍️ Bags.fm CTA + Escrow invest
│   │   ├── BagsAccessGate.tsx        # 🔐 Token-gated access
│   │   ├── BagsFeeDashboard.tsx      # 💰 Fee sharing dashboard
│   │   ├── AgroFund.tsx              # 📊 Milestone DAO governance
│   │   ├── AgroConnect.tsx           # 👥 Social trading hub
│   │   └── SolanaProvider.tsx        # ⛓️ Wallet adapter config
│   └── lib/
│       ├── bags-sdk.ts               # Bags API integration
│       ├── store.ts                  # Token specs & state
│       └── fundraising-db.js         # JSON-based project state
├── scripts/
│   ├── launch_bags_fundraising.js    # Launch token on Bags.fm
│   ├── create_devnet_commodity_tokens.js
│   └── init_fundraising_simple.js
├── agro-contracts/                   # Anchor smart contracts (Rust)
└── data/
    └── fundraising.json              # Project state DB
```

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Live App** | [localhost:3000](http://localhost:3000) |
| **GitHub** | [github.com/EgorovDimaIT/Agro-Exchange-Bugs](https://github.com/EgorovDimaIT/Agro-Exchange-Bugs) |
| **$AGRO on Bags.fm** | [bags.fm/token/BZBv...](https://bags.fm/token/BZBvHcjsZJVKwLJSesCSe3CyVJubXWAsz7Yo6VQ2bSA1) |
| **Bags SDK** | [npmjs.com/package/@bagsfm/bags-sdk](https://www.npmjs.com/package/@bagsfm/bags-sdk) |
| **Bags Docs** | [docs.bags.fm](https://docs.bags.fm) |

---

## 👥 Team


---

## 📄 License

MIT License — Open Source

> *Bringing Real-World Assets to Solana through Bags.fm Creator Finance*
