use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{constants::*, state::PoolState};


#[derive(Accounts)]
pub struct InitializePool<'info> {


    #[account(mut)]
    pub payer: Signer<'info>,


    #[account(
        init,
        payer = payer,
        space = 8 + PoolState::INIT_SPACE,
        seeds = [
            b"pool",
            token_a_mint.key().as_ref(),
            token_b_mint.key().as_ref()
        ],
        bump
    )]
    pub pool: Account<'info, PoolState>,

    // Holds Token A
    #[account(
        init,
        payer = payer,
        token::mint = token_a_mint,
        token::authority = pool,
        seeds = [
            b"vault_a",
            token_a_mint.key().as_ref(),
            token_b_mint.key().as_ref()
        ],
        bump
    )]
    pub vault_a: Account<'info, TokenAccount>,

    // Holds Token B
    #[account(
        init,
        payer = payer,
        token::mint = token_b_mint,
        token::authority = pool,
        seeds = [
            b"vault_b",
            token_a_mint.key().as_ref(),
            token_b_mint.key().as_ref()
        ],
        bump
    )]
    pub vault_b: Account<'info, TokenAccount>,

    // Defines our LP token
    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = pool,
        seeds = [
            b"lp_mint",
            token_a_mint.key().as_ref(),
            token_b_mint.key().as_ref()
        ],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,

    // Existing token definitions
    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


pub fn handler(ctx: Context<InitializePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    pool.token_a_mint = ctx.accounts.token_a_mint.key();
    pool.token_b_mint = ctx.accounts.token_b_mint.key();

    pool.token_a_vault = ctx.accounts.vault_a.key();
    pool.token_b_vault = ctx.accounts.vault_b.key();

    pool.lp_token_mint = ctx.accounts.lp_mint.key();

    pool.fee_bps = 30;
    pool.bump = ctx.bumps.pool;

    msg!("Pool initialized successfully");

    Ok(())
}