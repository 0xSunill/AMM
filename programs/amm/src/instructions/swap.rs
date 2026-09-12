use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{constants::*, state::PoolState};

use crate::error::ErrorCode;
#[derive(Accounts)]
pub struct Swap<'info> {
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
    token::mint = token_a_mint,
    token::authority = pool,
)]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(
    mut,
    address = pool.token_b_vault,
    token::mint = token_b_mint,
    token::authority = pool,
)]
    pub vault_b: Account<'info, TokenAccount>,

    // #[account(
    //     mut,
    //     address = pool.lp_token_mint,
    // )]
    // pub lp_mint: Account<'info, Mint>,
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

    // #[account(
    //     mut,
    //     token::mint = lp_mint,
    //     token::authority = user
    // )]
    // pub user_lp_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
    a_to_b: bool,
) -> Result<()> {
    // 1. Validate amount_in > 0
    require!(amount_in > 0, ErrorCode::InvalidAmount);

    // 2. Read current reserve A and reserve B

    let reserve_a = ctx.accounts.vault_a.amount;
    let reserve_b = ctx.accounts.vault_b.amount;
    // 3. Determine input reserve and output reserve
    //    based on a_to_b
    let (reserve_in, reserve_out) = if a_to_b {
        (reserve_a, reserve_b)
    } else {
        (reserve_b, reserve_a)
    };

    // 4. Calculate swap fee
    let fee_amount = (amount_in as u128)
        .checked_mul(FEE_BPS as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    // 5. Calculate amount_in after fee
    let amount_in_after_fee = (amount_in as u128)
        .checked_sub(fee_amount as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;
    // 6. Calculate amount_out using constant-product formula

    require!(
        reserve_in > 0 && reserve_out > 0,
        ErrorCode::InsufficientLiquidity
    );
    let rev = (reserve_in as u128)
        .checked_add(amount_in_after_fee as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let amount_out = (amount_in_after_fee as u128)
        .checked_mul(reserve_out as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(rev)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    // 7. Check amount_out >= min_amount_out
    //    for slippage protection
    require!(amount_out >= min_amount_out, ErrorCode::SlippageExceeded);
    require!(amount_out > 0, ErrorCode::InvalidAmount);
    // 8. Transfer input token:
    //    User -> Pool Vault

    let input_vault = if a_to_b {
        ctx.accounts.vault_a.to_account_info()
    } else {
        ctx.accounts.vault_b.to_account_info()
    };

    let user_input_token_account = if a_to_b {
        ctx.accounts.user_token_a.to_account_info()
    } else {
        ctx.accounts.user_token_b.to_account_info()
    };

    let transfer_in_accounts = Transfer {
        from: user_input_token_account,
        to: input_vault,
        authority: ctx.accounts.user.to_account_info(),
    };

    let transfer_in_ctx = CpiContext::new(ctx.accounts.token_program.key(), transfer_in_accounts);

    token::transfer(transfer_in_ctx, amount_in)?;

    // 9. Create Pool PDA signer seeds
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

    // 10. Transfer output token:
    //     Pool Vault -> User
    let output_vault = if a_to_b {
        ctx.accounts.vault_b.to_account_info()
    } else {
        ctx.accounts.vault_a.to_account_info()
    };

    let user_output_token_account = if a_to_b {
        ctx.accounts.user_token_b.to_account_info()
    } else {
        ctx.accounts.user_token_a.to_account_info()
    };

    let transfer_out_accounts = Transfer {
        from: output_vault,
        to: user_output_token_account,
        authority: ctx.accounts.pool.to_account_info(),
    };

    let transfer_out_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        transfer_out_accounts,
        &signer_seeds_group,
    );

    token::transfer(transfer_out_ctx, amount_out)?;

    // 11. Return success

    msg!(
        "Swap executed: amount_in={}, amount_out={}, a_to_b={}",
        amount_in,
        amount_out,
        a_to_b
    );
    Ok(())
}
