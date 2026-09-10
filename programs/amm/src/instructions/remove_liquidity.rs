use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    error::ErrorCode,
    state::PoolState,
};

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


    #[account(
        address = pool.token_a_mint,
    )]
    pub token_a_mint: Account<'info, Mint>,

    #[account(
        address = pool.token_b_mint,
    )]
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

pub fn handler(
    ctx: Context<RemoveLiquidity>,
    amount_lp: u64,
) -> Result<()> {
   
    let reserve_a = ctx.accounts.vault_a.amount;
    let reserve_b = ctx.accounts.vault_b.amount;

  
    let total_lp_supply = ctx.accounts.lp_mint.supply;

    let user_lp_balance = ctx.accounts.user_lp_token.amount;

   
    require!(
        amount_lp > 0,
        ErrorCode::BurnAmountMustBeGreaterThanZero
    );

    require!(
        total_lp_supply > 0,
        ErrorCode::LpSupplyMustNotBeZero
    );

    require!(
        amount_lp <= user_lp_balance,
        ErrorCode::BurnAmountMustNotExceedBalance
    );

    require!(
        reserve_a > 0 && reserve_b > 0,
        ErrorCode::InsufficientLiquidity
    );

 
    let amount_a = (amount_lp as u128)
        .checked_mul(reserve_a as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(total_lp_supply as u128)
        .ok_or(ErrorCode::MathOverflow)?;


    let amount_b = (amount_lp as u128)
        .checked_mul(reserve_b as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(total_lp_supply as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let amount_a = amount_a as u64;
    let amount_b = amount_b as u64;

    require!(
        amount_a > 0 && amount_b > 0,
        ErrorCode::InvalidAmount
    );


    let token_a_mint_key = ctx.accounts.token_a_mint.key();
    let token_b_mint_key = ctx.accounts.token_b_mint.key();
    let pool_bump = ctx.accounts.pool.bump;

    let signer_seeds: &[&[u8]] = &[
        POOL_SEED,
        token_a_mint_key.as_ref(),
        token_b_mint_key.as_ref(),
        &[pool_bump],
    ];

    let signer_seeds_group = [signer_seeds];

    let burn_accounts = Burn {
        mint: ctx.accounts.lp_mint.to_account_info(),
        from: ctx.accounts.user_lp_token.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        burn_accounts,
    );

    token::burn(burn_ctx, amount_lp)?;


    let transfer_a_accounts = Transfer {
        from: ctx.accounts.vault_a.to_account_info(),
        to: ctx.accounts.user_token_a.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };

    let transfer_a_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        transfer_a_accounts,
        &signer_seeds_group,
    );

    token::transfer(transfer_a_ctx, amount_a)?;


    let transfer_b_accounts = Transfer {
        from: ctx.accounts.vault_b.to_account_info(),
        to: ctx.accounts.user_token_b.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };

    let transfer_b_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        transfer_b_accounts,
        &signer_seeds_group,
    );

    token::transfer(transfer_b_ctx, amount_b)?;

    msg!(
        "Liquidity removed: LP burned={}, Token A={}, Token B={}",
        amount_lp,
        amount_a,
        amount_b
    );

    Ok(())
}