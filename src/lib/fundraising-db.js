// src/lib/fundraising-db.js
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'data', 'fundraising.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) return { projects: [] };
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
    if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function createOrUpdateProject(project) {
    const db = readDB();
    const index = db.projects.findIndex(p => p.id === project.id);
    if (index !== -1) db.projects[index] = project;
    else db.projects.push(project);
    writeDB(db);
}

module.exports = { readDB, writeDB, createOrUpdateProject };
