// agro-contracts/programs/agro-contracts/src/state/project.rs
use anchor_lang::prelude::*;

// ═══════════════════════════════════════════════
//  PROJECT STATE (хранится on-chain)
// ═══════════════════════════════════════════════

#[account]
pub struct FundingProject {
    // Администратор проекта (ты)
    pub admin: Pubkey,              // 32

    // Поставщик (получатель средств)
    pub supplier: Pubkey,           // 32

    // Адрес оракула (бэкенд-сервер)
    pub oracle: Pubkey,             // 32

    // Mint AGRO токена (для проверки прав голоса)
    pub agro_mint: Pubkey,          // 32

    // Название проекта
    pub name: [u8; 64],             // 64 bytes

    // Цель сбора в lamports
    pub target_lamports: u64,       // 8

    // Собрано на данный момент
    pub raised_lamports: u64,       // 8

    // Статус проекта
    pub status: ProjectStatus,      // 1

    // Текущий активный milestone (0-4)
    pub current_milestone: u8,      // 1

    // Количество инвесторов
    pub investor_count: u32,        // 4

    // Время создания
    pub created_at: i64,            // 8

    // Bump для PDA
    pub bump: u8,                   // 1
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProjectStatus {
    Funding,       // Идёт сбор средств
    Active,        // Проект запущен (все средства собраны)
    Completed,     // Все milestones выполнены
    Cancelled,     // Отменён (возврат средств)
}

impl FundingProject {
    // Размер аккаунта для расчёта rent
    pub const SIZE: usize = 8    // discriminator
        + 32   // admin
        + 32   // supplier
        + 32   // oracle
        + 32   // agro_mint
        + 64   // name
        + 8    // target_lamports
        + 8    // raised_lamports
        + 1    // status
        + 1    // current_milestone
        + 4    // investor_count
        + 8    // created_at
        + 1    // bump
        + 64;  // padding
}

// ═══════════════════════════════════════════════
//  MILESTONE STATE
// ═══════════════════════════════════════════════

#[account]
pub struct Milestone {
    // Родительский проект
    pub project: Pubkey,            // 32

    // Индекс milestone (0-4)
    pub index: u8,                  // 1

    // Сумма к выплате (в lamports)
    pub amount_lamports: u64,       // 8

    // Процент от общей суммы
    pub percentage: u8,             // 1

    // Статус
    pub status: MilestoneStatus,    // 1

    // Подтверждено оракулом
    pub oracle_confirmed_at: i64,   // 8 (0 если нет)

    // Дедлайн голосования (Unix timestamp)
    pub voting_deadline: i64,       // 8 (0 если нет)

    // Голоса ЗА (в весе токенов)
    pub yes_votes: u64,             // 8

    // Голоса ПРОТИВ
    pub no_votes: u64,              // 8

    // Количество уникальных голосующих
    pub voter_count: u32,           // 4

    // Tx подписи выплаты (для верификации)
    pub release_slot: u64,          // 8

    pub bump: u8,                   // 1
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MilestoneStatus {
    Locked,           // Ждёт предыдущего milestone
    OracleConfirmed,  // Оракул подтвердил, голосование открыто
    Voting,           // Идёт голосование
    Released,         // Средства выплачены
    Rejected,         // Отклонён DAO
}

impl Milestone {
    pub const SIZE: usize = 8
        + 32   // project
        + 1    // index
        + 8    // amount_lamports
        + 1    // percentage
        + 1    // status
        + 8    // oracle_confirmed_at
        + 8    // voting_deadline
        + 8    // yes_votes
        + 8    // no_votes
        + 4    // voter_count
        + 8    // release_slot
        + 1    // bump
        + 32;  // padding
}

// ═══════════════════════════════════════════════
//  INVESTOR RECORD
// ═══════════════════════════════════════════════

#[account]
pub struct InvestorRecord {
    pub project: Pubkey,            // 32
    pub investor: Pubkey,           // 32
    pub amount_lamports: u64,       // 8
    pub invested_at: i64,           // 8
    pub bump: u8,                   // 1
}

impl InvestorRecord {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 16;
}

// ═══════════════════════════════════════════════
//  VOTE RECORD (чтобы не голосовать дважды)
// ═══════════════════════════════════════════════

#[account]
pub struct VoteRecord {
    pub milestone: Pubkey,          // 32
    pub voter: Pubkey,              // 32
    pub vote: bool,                 // 1 (true=yes, false=no)
    pub weight: u64,                // 8 (вес = баланс AGRO)
    pub voted_at: i64,              // 8
    pub bump: u8,                   // 1
}

impl VoteRecord {
    pub const SIZE: usize = 8 + 32 + 32 + 1 + 8 + 8 + 1 + 16;
}
