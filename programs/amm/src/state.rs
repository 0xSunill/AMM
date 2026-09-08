use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolState {
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,

    pub token_a_vault: Pubkey,
    pub token_b_vault: Pubkey,

    pub lp_token_mint: Pubkey,

    pub fee_bps: u16,

    pub bump: u8,
}