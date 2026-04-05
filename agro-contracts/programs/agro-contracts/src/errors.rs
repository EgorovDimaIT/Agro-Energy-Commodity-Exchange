// agro-contracts/programs/agro-contracts/src/errors.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum AgroError {
    #[msg("Project is not in active funding state")]
    NotFunding,
    
    #[msg("Funding target already reached")]
    TargetReached,
    
    #[msg("Milestone is not ready for oracle confirmation")]
    MilestoneNotLocked,
    
    #[msg("Oracle has not confirmed this milestone yet")]
    OracleNotConfirmed,
    
    #[msg("Voting period has not ended")]
    VotingNotEnded,
    
    #[msg("Voting period has expired")]
    VotingExpired,
    
    #[msg("Wallet has already voted")]
    AlreadyVoted,
    
    #[msg("Insufficient token balance to vote")]
    InsufficientTokens,
    
    #[msg("Quorum not reached (need 51%)")]
    QuorumNotReached,
    
    #[msg("Vote was rejected by DAO")]
    VoteRejected,
    
    #[msg("Unauthorized: only oracle can call this")]
    UnauthorizedOracle,
    
    #[msg("Unauthorized: only admin can call this")]
    UnauthorizedAdmin,
    
    #[msg("Investment amount too small")]
    AmountTooSmall,
    
    #[msg("All milestones already completed")]
    AllMilestonesCompleted,
    
    #[msg("Arithmetic overflow")]
    Overflow,
}
