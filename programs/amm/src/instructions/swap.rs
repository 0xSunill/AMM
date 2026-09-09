use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{constants::*, state::PoolState};


#[derive(Accounts)]
pub struct Swap<'info> {


    #[account(mut)]
    pub payer: Signer<'info>,


    pub system_program: Program<'info, System>,
}


pub fn handler(ctx: Context<Swap>) -> Result<()> {
   

    Ok(())
}