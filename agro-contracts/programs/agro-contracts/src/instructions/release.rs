// agro-contracts/programs/agro-contracts/src/instructions/release.rs
use anchor_lang::prelude::*;
use crate::state::project::*;
use crate::errors::AgroError;

const QUORUM_MIN_VOTERS: u32 = 3;   // минимум 3 уникальных голоса
const QUORUM_YES_PCT: u64 = 51;     // 51% голосов ЗА

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct ReleaseFunds<'info> {
    // Любой может вызвать release если условия выполнены
    pub caller: Signer<'info>,

    #[account(mut)]
    pub project: Account<'info, FundingProject>,

    #[account(
        mut,
        seeds = [b"milestone", project.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
    )]
    pub milestone: Account<'info, Milestone>,

    // Vault (PDA) - откуда идут деньги
    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    // Получатель (поставщик)
    #[account(
        mut,
        constraint = supplier.key() == project.supplier,
    )]
    pub supplier: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn release_funds(
    ctx: Context<ReleaseFunds>,
    milestone_index: u8,
) -> Result<()> {
    let milestone_val = &ctx.accounts.milestone;
    let project_val = &ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    // Проверяем что голосование завершено
    require!(
        milestone_val.status == MilestoneStatus::Voting,
        AgroError::OracleNotConfirmed
    );

    require!(
        now >= milestone_val.voting_deadline,
        AgroError::VotingNotEnded
    );

    // Проверяем кворум
    require!(
        milestone_val.voter_count >= QUORUM_MIN_VOTERS,
        AgroError::QuorumNotReached
    );

    // Проверяем процент ЗА
    let total_votes = milestone_val.yes_votes + milestone_val.no_votes;
    let yes_pct = if total_votes > 0 {
        (milestone_val.yes_votes * 100) / total_votes
    } else {
        0
    };

    require!(yes_pct > QUORUM_YES_PCT, AgroError::VoteRejected);

    // ══════════════════════════════════════
    // CPI: Переводим SOL из Vault → Supplier
    // Vault это PDA поэтому нужны seeds для подписи
    // ══════════════════════════════════════
    let project_key = project_val.key();
    let seeds = &[
        b"vault",
        project_key.as_ref(),
        &[ctx.bumps.vault],
    ];
    let signer_seeds = &[&seeds[..]];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.supplier.to_account_info(),
            },
            signer_seeds,
        ),
        milestone_val.amount_lamports,
    )?;

    // Обновляем статус
    let milestone = &mut ctx.accounts.milestone;
    milestone.status = MilestoneStatus::Released;
    milestone.release_slot = Clock::get()?.slot;

    // Обновляем проект
    let project = &mut ctx.accounts.project;
    project.current_milestone = milestone_index + 1;

    // Проверяем - все milestones выполнены?
    if project.current_milestone >= 5 {
        project.status = ProjectStatus::Completed;
        msg!("🎉 ALL MILESTONES COMPLETED! Project is Completed");
    }

    msg!(
        "💰 Released {} lamports ({} SOL) to supplier {} | YES: {}%",
        milestone.amount_lamports,
        milestone.amount_lamports as f64 / 1e9,
        ctx.accounts.supplier.key(),
        yes_pct,
    );

    Ok(())
}

// ═══════════════════════════════════════════════
//  REFUND (если проект провалился)
// ═══════════════════════════════════════════════

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        constraint = project.status == ProjectStatus::Cancelled 
            @ AgroError::NotFunding,
    )]
    pub project: Account<'info, FundingProject>,

    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"investor",
            project.key().as_ref(),
            investor.key().as_ref()
        ],
        bump = investor_record.bump,
        constraint = investor_record.investor == investor.key(),
        constraint = investor_record.amount_lamports > 0,
        close = investor,  // закрываем аккаунт и возвращаем rent
    )]
    pub investor_record: Account<'info, InvestorRecord>,

    pub system_program: Program<'info, System>,
}

pub fn refund(ctx: Context<Refund>) -> Result<()> {
    let project_key = ctx.accounts.project.key();
    let amount = ctx.accounts.investor_record.amount_lamports;

    let seeds = &[
        b"vault",
        project_key.as_ref(),
        &[ctx.bumps.vault],
    ];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.investor.to_account_info(),
            },
            &[&seeds[..]],
        ),
        amount,
    )?;

    msg!("↩️ Refunded {} lamports to {}", amount, ctx.accounts.investor.key());
    Ok(())
}
