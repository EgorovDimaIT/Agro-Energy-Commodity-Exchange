// agro-contracts/programs/agro-contracts/src/instructions/initialize.rs
use anchor_lang::prelude::*;
use crate::state::project::*;
use crate::errors::AgroError;

// ═══════════════════════════════════════════════
//  INITIALIZE PROJECT
// ═══════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(project_id: String)]
pub struct InitializeProject<'info> {
    // Платит за создание аккаунтов
    #[account(mut)]
    pub admin: Signer<'info>,

    // PDA аккаунт проекта
    #[account(
        init,
        payer = admin,
        space = FundingProject::SIZE,
        seeds = [b"project", project_id.as_bytes()],
        bump,
    )]
    pub project: Account<'info, FundingProject>,

    // Vault - кошелёк эскроу (PDA без приватного ключа!)
    #[account(
        seeds = [b"vault", project.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ═══════════════════════════════════════════════
//  INITIALIZE MILESTONE
// ═══════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct InitializeMilestone<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = project.admin == admin.key() @ AgroError::UnauthorizedAdmin,
    )]
    pub project: Account<'info, FundingProject>,

    #[account(
        init,
        payer = admin,
        space = Milestone::SIZE,
        seeds = [b"milestone", project.key().as_ref(), &[index]],
        bump,
    )]
    pub milestone: Account<'info, Milestone>,

    pub system_program: Program<'info, System>,
}

// ═══════════════════════════════════════════════
//  HANDLERS
// ═══════════════════════════════════════════════

pub fn initialize_project(
    ctx: Context<InitializeProject>,
    project_id: String,
    name: String,
    supplier: Pubkey,
    oracle: Pubkey,
    agro_mint: Pubkey,
    target_lamports: u64,
) -> Result<()> {
    let project = &mut ctx.accounts.project;

    // Конвертируем имя в fixed-size array
    let mut name_bytes = [0u8; 64];
    let name_slice = name.as_bytes();
    let len = name_slice.len().min(64);
    name_bytes[..len].copy_from_slice(&name_slice[..len]);

    project.admin = ctx.accounts.admin.key();
    project.supplier = supplier;
    project.oracle = oracle;
    project.agro_mint = agro_mint;
    project.name = name_bytes;
    project.target_lamports = target_lamports;
    project.raised_lamports = 0;
    project.status = ProjectStatus::Funding;
    project.current_milestone = 0;
    project.investor_count = 0;
    project.created_at = Clock::get()?.unix_timestamp;
    project.bump = ctx.bumps.project;

    msg!("Project initialized: {}", project_id);
    Ok(())
}

pub fn initialize_milestone(
    ctx: Context<InitializeMilestone>,
    index: u8,
    amount_lamports: u64,
    percentage: u8,
) -> Result<()> {
    let milestone = &mut ctx.accounts.milestone;

    milestone.project = ctx.accounts.project.key();
    milestone.index = index;
    milestone.amount_lamports = amount_lamports;
    milestone.percentage = percentage;
    milestone.status = if index == 0 {
        MilestoneStatus::OracleConfirmed  // Первый milestone сразу готов к голосованию
    } else {
        MilestoneStatus::Locked
    };
    milestone.oracle_confirmed_at = 0;
    milestone.voting_deadline = 0;
    milestone.yes_votes = 0;
    milestone.no_votes = 0;
    milestone.voter_count = 0;
    milestone.release_slot = 0;
    milestone.bump = ctx.bumps.milestone;

    msg!("Milestone {} initialized: {} lamports ({}%)", 
        index, amount_lamports, percentage);
    Ok(())
}
