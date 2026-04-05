// app/api/fundraising-simple/status/route.ts
import { NextResponse } from 'next/server';
const { readDB } = require('../../../../lib/fundraising-db');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = readDB();
    const project = db.projects.find((p: any) => p.id === id);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ success: true, project });
}
