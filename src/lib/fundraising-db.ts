// src/lib/fundraising-db.ts
import * as fs from 'fs';
import * as path from 'path';

export interface FundraisingProject {
    id: string;
    name: string;
    description: string;
    tokenMint: string;
    escrowWallet: string;
    targetSOL: number;
    raisedSOL: number;
    status: 'funding' | 'active' | 'completed' | 'cancelled';
    currentMilestone: number;
    createdAt: string;
    milestones: any[];
    investors: any[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'fundraising.json');

export function readDB(): { projects: FundraisingProject[] } {
    if (!fs.existsSync(DB_PATH)) {
        return { projects: [] };
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

export function writeDB(data: { projects: FundraisingProject[] }) {
    if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH));
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getProject(id: string): FundraisingProject | undefined {
    return readDB().projects.find(p => p.id === id);
}

export function createOrUpdateProject(project: FundraisingProject) {
    const db = readDB();
    const index = db.projects.findIndex(p => p.id === project.id);
    if (index !== -1) db.projects[index] = project;
    else db.projects.push(project);
    writeDB(db);
}

export function addInvestor(projectId: string, investor: any) {
    const db = readDB();
    const project = db.projects.find(p => p.id === projectId);
    if (project) {
        project.investors.push(investor);
        project.raisedSOL += investor.amountSOL;
        writeDB(db);
    }
}
