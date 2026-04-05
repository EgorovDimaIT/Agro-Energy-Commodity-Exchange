// agro-contracts/programs/agro-contracts/src/lib.rs
use anchor_lang::prelude::*;

mod errors;
mod state;
mod instructions;

use instructions::initialize::*;
use instructions::invest::*;
use instructions::vote::*;
use instructions::release::*;

declare_id!("HRoRYh7hCxSuq8zcph973aaAWfyPBtH9ynbcYMFrnAmP"); // заполнится после anchor build

#[program]
pub mod agro_contracts {
    use super::*;

    // ── Инициализация ──
    pub fn initialize_project(
        ctx: Context<InitializeProject>,
        project_id: String,
        name: String,
        supplier: Pubkey,
        oracle: Pubkey,
        agro_mint: Pubkey,
        target_lamports: u64,
    ) -> Result<()> {
        instructions::initialize::initialize_project(
            ctx, project_id, name, supplier, oracle, agro_mint, target_lamports
        )
    }

    pub fn initialize_milestone(
        ctx: Context<InitializeMilestone>,
        index: u8,
        amount_lamports: u64,
        percentage: u8,
    ) -> Result<()> {
        instructions::initialize::initialize_milestone(
            ctx, index, amount_lamports, percentage
        )
    }

    // ── Инвестирование ──
    pub fn invest(ctx: Context<Invest>, amount_lamports: u64) -> Result<()> {
        instructions::invest::invest(ctx, amount_lamports)
    }

    // ── Оракул ──
    pub fn oracle_confirm(
        ctx: Context<OracleConfirm>,
        milestone_index: u8,
    ) -> Result<()> {
        instructions::vote::oracle_confirm(ctx, milestone_index)
    }

    // ── Голосование ──
    pub fn cast_vote(
        ctx: Context<CastVote>,
        milestone_index: u8,
        approve: bool,
    ) -> Result<()> {
        instructions::vote::cast_vote(ctx, milestone_index, approve)
    }

    // ── Выплата ──
    pub fn release_funds(
        ctx: Context<ReleaseFunds>,
        milestone_index: u8,
    ) -> Result<()> {
        instructions::release::release_funds(ctx, milestone_index)
    }

    // ── Возврат средств ──
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        instructions::release::refund(ctx)
    }
}
