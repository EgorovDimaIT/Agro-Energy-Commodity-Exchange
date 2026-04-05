// scripts/init_fundraising_simple.js
const { createOrUpdateProject } = require('../src/lib/fundraising-db');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const PROJECT_CONFIG = {
    id: 'owht-cairo-q3-2026',
    name: 'Odesa-Cairo Wheat Corridor Q3 2026',
    description: 'Fundraising for a real wheat shipment from Odesa to Cairo. Governance through Milestone DAO.',
    tokenMint: process.env.NEXT_PUBLIC_AGRO_TOKEN_MINT || "BZBvHcjsZJVKwLJSesCSe3CyVJubXWAsz7Yo6VQ2bSA1",
    escrowWallet: "FJwqsC4y6dT6yLy4XQZEaAjzDEWbXkiJxJi6BfGS5naf",
    targetSOL: 5.0,
    raisedSOL: 1.25,
    status: 'funding',
    currentMilestone: 0,
    createdAt: new Date().toISOString(),
    milestones: [
        { index: 0, title: 'Contract Signing & Insurance', amountSOL: 0.5, percentage: 10, status: 'oracle_confirmed' },
        { index: 1, title: 'Warehouse Verification & Audit', amountSOL: 1.0, percentage: 20, status: 'locked' },
        { index: 2, title: 'Loading & Ship Departure', amountSOL: 1.5, percentage: 30, status: 'locked' },
        { index: 3, title: 'In-Transit Oracle Confirmation', amountSOL: 1.0, percentage: 20, status: 'locked' },
        { index: 4, title: 'Final Delivery & Settlement', amountSOL: 1.0, percentage: 20, status: 'locked' },
    ],
    investors: [
        { wallet: "bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg", amountSOL: 1.25, tokenBalance: 125, investedAt: new Date().toISOString() }
    ],
};

console.log('🚀 Initializing project on Devnet (English)...');
createOrUpdateProject(PROJECT_CONFIG);
console.log('✅ Project successfully updated with English data!');
