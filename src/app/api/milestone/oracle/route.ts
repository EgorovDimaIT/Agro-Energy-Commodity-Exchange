// src/app/api/milestone/oracle/route.ts
import { NextResponse } from 'next/server';
import { store, getProject, getMilestone, addActivity } from '@/lib/store';

export async function POST(request: Request) {
    try {
        const { projectId, milestoneId } = await request.json();

        const project = getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const milestone = getMilestone(projectId, milestoneId);
        if (!milestone) {
            return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
        }

        if (milestone.status !== 'locked') {
            return NextResponse.json(
                { error: `Milestone is ${milestone.status}, not locked` },
                { status: 400 }
            );
        }

        // ── Симуляция Oracle Confirmation ──
        milestone.status = 'oracle_confirmed';
        milestone.oracleConfirmedAt = new Date().toISOString();

        // Сразу открываем голосование (72 часа = для демо 10 минут)
        const votingDeadline = new Date(Date.now() + 10 * 60 * 1000); // 10 минут для демо
        milestone.status = 'voting';
        milestone.votingDeadline = votingDeadline.toISOString();

        // Добавляем в ленту активности
        addActivity(
            'ORACLE_BOT',
            '🔮 Oracle Confirmed',
            `Milestone #${milestoneId}: "${milestone.title}" — Logistics proof verified`,
        );

        return NextResponse.json({
            success: true,
            message: `Oracle confirmed! Voting started for Milestone #${milestoneId}`,
            milestone: {
                id: milestone.id,
                status: milestone.status,
                votingDeadline: milestone.votingDeadline,
                title: milestone.title,
                amountSOL: milestone.amountSOL,
            },
        });
    } catch (error) {
        console.error('Oracle API error:', error);
        return NextResponse.json({ error: 'Oracle simulation failed' }, { status: 500 });
    }
}
