use std::cmp;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::{constants::*, error::ErrorCode, state::PoolState};

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [
            POOL_SEED,
            token_a_mint.key().as_ref(),
            token_b_mint.key().as_ref()
        ],
        bump = pool.bump,
    )]
    pub pool: Account<'info, PoolState>,

    #[account(
        mut,
        address = pool.token_a_vault,
    )]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = pool.token_b_vault,
    )]
    pub vault_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = pool.lp_token_mint,
    )]
    pub lp_mint: Account<'info, Mint>,

    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = token_a_mint,
        token::authority = user,
    )]
    pub user_token_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_b_mint,
        token::authority = user,
    )]
    pub user_token_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = lp_mint,
        token::authority = user,
    )]
    pub user_lp_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}


pub fn handler(ctx: Context<RemoveLiquidity>) -> Result<()> {
 // 1. Read the current Token A reserve from Vault A

    // 2. Read the current Token B reserve from Vault B

    // 3. Read the total LP token supply

    // 4. Validate that the user wants to burn more than 0 LP tokens

    // 5. Validate that the LP supply is not zero

    // 6. Calculate how much Token A the user should receive

    // 7. Calculate how much Token B the user should receive

    // 8. Burn the user's LP tokens

    // 9. Create the PDA signer seeds for the Pool

    // 10. Transfer Token A from Vault A to the user's Token A account

    // 11. Transfer Token B from Vault B to the user's Token B account

    // 12. Return success

    Ok(())
}