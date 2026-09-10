use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Burn amount must be greater than zero")]
    BurnAmountMustBeGreaterThanZero,

    #[msg("LP supply must not be zero")]
    LpSupplyMustNotBeZero,

    #[msg("Burn amount must not exceed balance")]
    BurnAmountMustNotExceedBalance,
    
}