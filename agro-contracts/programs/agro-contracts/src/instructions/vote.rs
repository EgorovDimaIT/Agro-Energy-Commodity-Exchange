// agro-contracts/programs/agro-contracts/src/instructions/vote.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount};
use crate::state::project::*;
use crate::errors::AgroError;

// ═══════════════════════════════════════════════
//  ORACLE CONFIRM MILESTONE
// ═══════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct OracleConfirm<'info> {
    // Только зарегистрированный оракул может вызвать
    #[account(
        constraint = oracle.key() == project.oracle @ AgroError::UnauthorizedOracle
    )]
    pub oracle: Signer<'info>,

    pub project: Account<'info, FundingProject>,

    #[account(
        mut,
        seeds = [b"milestone", project.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
        constraint = milestone.status == MilestoneStatus::Locked 
            @ AgroError::MilestoneNotLocked,
    )]
    pub milestone: Account<'info, Milestone>,
}

pub fn oracle_confirm(
    ctx: Context<OracleConfirm>,
    _milestone_index: u8,
) -> Result<()> {
    let milestone = &mut ctx.accounts.milestone;
    let now = Clock::get()?.unix_timestamp;

    milestone.status = MilestoneStatus::Voting;
    milestone.oracle_confirmed_at = now;
    // Для Devnet демо - 10 минут. Для Mainnet - 72 часа
    milestone.voting_deadline = now + 600; // 600 секунд = 10 минут

    msg!(
        "🔮 Oracle confirmed milestone {}. Voting open until: {}",
        milestone.index,
        milestone.voting_deadline
    );

    Ok(())
}

// ═══════════════════════════════════════════════
//  CAST VOTE
// ═══════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(milestone_index: u8, approve: bool)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    pub project: Account<'info, FundingProject>,

    #[account(
        mut,
        seeds = [b"milestone", project.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
        constraint = milestone.status == MilestoneStatus::Voting 
            @ AgroError::OracleNotConfirmed,
    )]
    pub milestone: Account<'info, Milestone>,

    // Токен-аккаунт AGRO голосующего
    #[account(
        constraint = agro_token_account.owner == voter.key(),
        constraint = agro_token_account.mint == project.agro_mint,
    )]
    pub agro_token_account: Account<'info, TokenAccount>,

    // Запись голоса (PDA) - гарантирует что нельзя проголосовать дважды
    #[account(
        init,                    // init (не init_if_needed!) - падёт если уже существует
        payer = voter,
        space = VoteRecord::SIZE,
        seeds = [
            b"vote",
            milestone.key().as_ref(),
            voter.key().as_ref()
        ],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
}

pub fn cast_vote(
    ctx: Context<CastVote>,
    _milestone_index: u8,
    approve: bool,
) -> Result<()> {
    let milestone = &mut ctx.accounts.milestone;
    let vote_record = &mut ctx.accounts.vote_record;
    let now = Clock::get()?.unix_timestamp;

    // Проверяем дедлайн
    require!(
        now < milestone.voting_deadline,
        AgroError::VotingExpired
    );

    // Вес голоса = баланс AGRO токенов
    let vote_weight = ctx.accounts.agro_token_account.amount;
    require!(vote_weight > 0, AgroError::InsufficientTokens);

    // Записываем голос
    if approve {
        milestone.yes_votes = milestone.yes_votes
            .checked_add(vote_weight)
            .ok_or(AgroError::Overflow)?;
    } else {
        milestone.no_votes = milestone.no_votes
            .checked_add(vote_weight)
            .ok_or(AgroError::Overflow)?;
    }

    milestone.voter_count = milestone.voter_count
        .checked_add(1)
        .ok_or(AgroError::Overflow)?;

    // Сохраняем запись голоса
    vote_record.milestone = milestone.key();
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.vote = approve;
    vote_record.weight = vote_weight;
    vote_record.voted_at = now;
    vote_record.bump = ctx.bumps.vote_record;

    let total_votes = milestone.yes_votes + milestone.no_votes;
    let yes_pct = if total_votes > 0 {
        (milestone.yes_votes * 100) / total_votes
    } else {
        0
    };

    msg!(
        "🗳️ Vote cast by {} | {} | Weight: {} AGRO | YES: {}%",
        ctx.accounts.voter.key(),
        if approve { "YES ✅" } else { "NO ❌" },
        vote_weight,
        yes_pct,
    );

    Ok(())
}
