use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    error::ErrorCode,
    state::PoolState,
};

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
  
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
        token::authority = user
    )]
    pub user_lp_token: Account<'info, TokenAccount>,

  
    pub token_program: Program<'info, Token>,
}

pub fn handler(
    ctx: Context<AddLiquidity>,
    amount_a: u64,
    amount_b: u64,
) -> Result<()> {
 
    require!(amount_a > 0, ErrorCode::InvalidAmount);
    require!(amount_b > 0, ErrorCode::InvalidAmount);

    let reserve_a = ctx.accounts.vault_a.amount;
    let reserve_b = ctx.accounts.vault_b.amount;
    let lp_supply = ctx.accounts.lp_mint.supply;


    let lp_to_mint = if lp_supply == 0 {
      
        let product = (amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        integer_sqrt(product) as u64
    } else {
      
        require!(
            reserve_a > 0 && reserve_b > 0,
            ErrorCode::InsufficientLiquidity
        );

        let left = (amount_a as u128)
            .checked_mul(reserve_b as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        let right = (amount_b as u128)
            .checked_mul(reserve_a as u128)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(left == right, ErrorCode::InvalidAmount);


        amount_a
            .checked_mul(lp_supply)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(reserve_a)
            .ok_or(ErrorCode::MathOverflow)?
    };

    require!(lp_to_mint > 0, ErrorCode::InvalidAmount);


    let transfer_a_accounts = Transfer {
        from: ctx.accounts.user_token_a.to_account_info(),
        to: ctx.accounts.vault_a.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let transfer_a_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        transfer_a_accounts,
    );

    token::transfer(transfer_a_ctx, amount_a)?;

    let transfer_b_accounts = Transfer {
        from: ctx.accounts.user_token_b.to_account_info(),
        to: ctx.accounts.vault_b.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let transfer_b_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        transfer_b_accounts,
    );

    token::transfer(transfer_b_ctx, amount_b)?;


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


    let mint_to_accounts = MintTo {
        mint: ctx.accounts.lp_mint.to_account_info(),
        to: ctx.accounts.user_lp_token.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };

    let mint_to_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        mint_to_accounts,
        &signer_seeds_group,
    );

    token::mint_to(mint_to_ctx, lp_to_mint)?;

    msg!(
        "Liquidity added: A={}, B={}, LP minted={}",
        amount_a,
        amount_b,
        lp_to_mint
    );

    Ok(())
}


fn integer_sqrt(value: u128) -> u128 {
    if value == 0 {
        return 0;
    }

    let mut x = value;
    let mut y = (x + value / x) / 2;

    while y < x {
        x = y;
        y = (x + value / x) / 2;
    }

    x
}



























// use std::cmp;

// use anchor_lang::prelude::*;
// use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

// use crate::{constants::*, error::ErrorCode, state::PoolState};

// #[derive(Accounts)]
// pub struct AddLiquidity<'info> {
//     #[account(mut)]
//     pub user: Signer<'info>,

//     #[account(
//         mut,
//         seeds = [
//             POOL_SEED,
//             token_a_mint.key().as_ref(),
//             token_b_mint.key().as_ref()
//         ],
//         bump = pool.bump,
//     )]
//     pub pool: Account<'info, PoolState>,

//     #[account(
//         mut,
//         address = pool.token_a_vault,
//     )]
//     pub vault_a: Account<'info, TokenAccount>,

//     #[account(
//         mut,
//         address = pool.token_b_vault,
//     )]
//     pub vault_b: Account<'info, TokenAccount>,

//     #[account(
//         mut,
//         address = pool.lp_token_mint,
//     )]
//     pub lp_mint: Account<'info, Mint>,

//     pub token_a_mint: Account<'info, Mint>,
//     pub token_b_mint: Account<'info, Mint>,

//     #[account(
//         mut,
//         token::mint = token_a_mint,
//         token::authority = user,
//     )]
//     pub user_token_a: Account<'info, TokenAccount>,

//     #[account(
//         mut,
//         token::mint = token_b_mint,
//         token::authority = user,
//     )]
//     pub user_token_b: Account<'info, TokenAccount>,

//     #[account(
//         mut,
//         token::mint = lp_mint,
//         token::authority = user,
//     )]
//     pub user_lp_token: Account<'info, TokenAccount>,

//     pub token_program: Program<'info, Token>,
// }

// pub fn handler(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64) -> Result<()> {
//     let reserve_a = ctx.accounts.vault_a.amount;
//     let reserve_b = ctx.accounts.vault_b.amount;
//     let lp_supply = ctx.accounts.lp_mint.supply;

//     require!(amount_a > 0, ErrorCode::InvalidAmount);
//     require!(amount_b > 0, ErrorCode::InvalidAmount);
//     require!(amount_a == amount_b, ErrorCode::InvalidAmount);

//     let lp_to_mint = if lp_supply == 0 {
//         integer_sqrt(
//             amount_a
//                 .checked_mul(amount_b)
//                 .ok_or(ErrorCode::MathOverflow)?,
//         )
//     } else {
//         require!(reserve_a > 0, ErrorCode::InsufficientLiquidity);
//         require!(reserve_b > 0, ErrorCode::InsufficientLiquidity);

//         let lp_amount_a = amount_a
//             .checked_mul(lp_supply)
//             .ok_or(ErrorCode::MathOverflow)?
//             .checked_div(reserve_a)
//             .ok_or(ErrorCode::MathOverflow)?;

//         let lp_amount_b = amount_b
//             .checked_mul(lp_supply)
//             .ok_or(ErrorCode::MathOverflow)?
//             .checked_div(reserve_b)
//             .ok_or(ErrorCode::MathOverflow)?;

//         cmp::min(lp_amount_a, lp_amount_b)
//     };

//     require!(lp_to_mint > 0, ErrorCode::InvalidAmount);

//     let transfer_a_accounts = Transfer {
//         from: ctx.accounts.user_token_a.to_account_info(),
//         to: ctx.accounts.vault_a.to_account_info(),
//         authority: ctx.accounts.user.to_account_info(),
//     };


//     let transfer_a_ctx = CpiContext::new(ctx.accounts.token_program.key(), transfer_a_accounts);
//     token::transfer(transfer_a_ctx, amount_a)?;

//     let transfer_b_accounts = Transfer {
//         from: ctx.accounts.user_token_b.to_account_info(),
//         to: ctx.accounts.vault_b.to_account_info(),
//         authority: ctx.accounts.user.to_account_info(),
//     };

//     let transfer_b_ctx = CpiContext::new(ctx.accounts.token_program.key(), transfer_b_accounts);

//     token::transfer(transfer_b_ctx, amount_b)?;

//     let pool_key = ctx.accounts.pool.key();

//     let token_a_mint_key = ctx.accounts.token_a_mint.key();
//     let token_b_mint_key = ctx.accounts.token_b_mint.key();

//     let signer_seeds: &[&[u8]] = &[
//         POOL_SEED,
//         token_a_mint_key.as_ref(),
//         token_b_mint_key.as_ref(),
//         &[ctx.accounts.pool.bump],
//     ];

//     let mint_to_accounts = MintTo {
//         mint: ctx.accounts.lp_mint.to_account_info(),
//         to: ctx.accounts.user_lp_token.to_account_info(),
//         authority: ctx.accounts.pool.to_account_info(),
//     };

//     let signer_seeds_group = [signer_seeds];

//     let mint_to_ctx = CpiContext::new_with_signer(
//         ctx.accounts.token_program.key(),
//         mint_to_accounts,
//         &signer_seeds_group,
//     );

//     token::mint_to(mint_to_ctx, lp_to_mint)?;

//     msg!(
//         "Liquidity added: A={}, B={}, LP minted={}",
//         amount_a,
//         amount_b,
//         lp_to_mint
//     );

//     let _ = pool_key;

//     Ok(())
// }

// fn integer_sqrt(value: u64) -> u64 {
//     if value == 0 {
//         return 0;
//     }

//     let mut x = value;
//     let mut y = (x + value / x) / 2;

//     while y < x {
//         x = y;
//         y = (x + value / x) / 2;
//     }

//     x
// }
