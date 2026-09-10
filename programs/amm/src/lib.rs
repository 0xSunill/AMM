pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;   

declare_id!("6gi14ywqAw7HR8kUUrRaK8dkXNdW2PyRifZT1nMkbct2");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize(ctx: Context<InitializePool>) -> Result<()> {
        crate::instructions::initialize_pool::handler(ctx)
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>,amount_a:u64,amount_b:u64) -> Result<()> {
        crate::instructions::add_liquidity::handler(ctx,amount_a,amount_b)
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, amount_lp:u64) -> Result<()> {
        crate::instructions::remove_liquidity::handler(ctx,amount_lp)
    }

    pub fn swap(ctx: Context<Swap>) -> Result<()> {
        crate::instructions::swap::handler(ctx)
    }
}
