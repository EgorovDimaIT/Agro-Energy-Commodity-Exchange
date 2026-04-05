// agro-contracts/programs/agro-contracts/src/instructions/invest.rs
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::project::*;
use crate::errors::AgroError;

#[derive(Accounts)]
pub struct Invest<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        constraint = project.status == ProjectStatus::Funding 
            @ AgroError::NotFunding,
    )]
    pub project: Account<'info, FundingProject>,

    // Vault куда идут деньги (PDA)
    #[account(
        mut,
        seeds = [b"vault", project.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    // Запись об инвестиции этого конкретного инвестора
    #[account(
        init_if_needed,
        payer = investor,
        space = InvestorRecord::SIZE,
        seeds = [
            b"investor",
            project.key().as_ref(),
            investor.key().as_ref()
        ],
        bump,
    )]
    pub investor_record: Account<'info, InvestorRecord>,

    pub system_program: Program<'info, System>,
}

pub fn invest(ctx: Context<Invest>, amount_lamports: u64) -> Result<()> {
    require!(
        amount_lamports >= 10_000_000, // минимум 0.01 SOL
        AgroError::AmountTooSmall
    );

    let project = &mut ctx.accounts.project;
    let investor_record = &mut ctx.accounts.investor_record;

    // Переводим SOL в vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.investor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount_lamports,
    )?;

    // Обновляем статистику
    project.raised_lamports = project.raised_lamports
        .checked_add(amount_lamports)
        .ok_or(AgroError::Overflow)?;

    // Если впервые инвестирует - увеличиваем счётчик
    if investor_record.amount_lamports == 0 {
        project.investor_count = project.investor_count
            .checked_add(1)
            .ok_or(AgroError::Overflow)?;
    }

    // Обновляем запись инвестора
    investor_record.project = project.key();
    investor_record.investor = ctx.accounts.investor.key();
    investor_record.amount_lamports = investor_record.amount_lamports
        .checked_add(amount_lamports)
        .ok_or(AgroError::Overflow)?;
    investor_record.invested_at = Clock::get()?.unix_timestamp;

    // Если цель достигнута - меняем статус
    if project.raised_lamports >= project.target_lamports {
        project.status = ProjectStatus::Active;
        msg!("🎉 Funding target reached! Project is now Active");
    }

    msg!(
        "✅ Investment: {} lamports from {}. Total: {}/{}",
        amount_lamports,
        ctx.accounts.investor.key(),
        project.raised_lamports,
        project.target_lamports,
    );

    Ok(())
}
