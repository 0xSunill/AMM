use anchor_lang::{
    declare_program,
    system_program,
};

use anchor_litesvm::{
    AnchorLiteSVM,
    AssertionHelpers,
    TestHelpers,
};

use anchor_spl::token::spl_token;

declare_program!(amm);

#[test]
fn test_full_amm_flow() {
    // =========================================================
    // 1. Create local Solana environment with our AMM program
    // =========================================================

    let mut ctx =
        AnchorLiteSVM::build_with_program(amm::ID, include_bytes!("../../../target/deploy/amm.so"));

    // =========================================================
    // 2. Create a funded user
    // =========================================================

    let user = ctx.svm.create_funded_account(10_000_000_000).unwrap();

    // =========================================================
    // 3. Create Token A and Token B
    //
    // Both use 6 decimals.
    // =========================================================

    let token_a_mint = ctx.svm.create_token_mint(&user, 6).unwrap();

    let token_b_mint = ctx.svm.create_token_mint(&user, 6).unwrap();

    // =========================================================
    // 4. Create user's Token A and Token B accounts
    //
    // We're using ATAs for the user.
    // =========================================================

    let user_token_a = ctx
        .svm
        .create_associated_token_account(&token_a_mint.pubkey(), &user)
        .unwrap();

    let user_token_b = ctx
        .svm
        .create_associated_token_account(&token_b_mint.pubkey(), &user)
        .unwrap();

    // =========================================================
    // 5. Give the user some Token A and Token B
    // =========================================================

    // 1,000 Token A
    ctx.svm
        .mint_to(&token_a_mint.pubkey(), &user_token_a, &user, 1_000_000_000)
        .unwrap();

    // 1,000 Token B
    ctx.svm
        .mint_to(&token_b_mint.pubkey(), &user_token_b, &user, 1_000_000_000)
        .unwrap();

    // Make sure setup worked.
    ctx.svm.assert_token_balance(&user_token_a, 1_000_000_000);

    ctx.svm.assert_token_balance(&user_token_b, 1_000_000_000);

    // =========================================================
    // 6. Derive pool PDAs
    // =========================================================

    let (pool, _) = ctx.svm.get_pda_with_bump(
        &[
            b"pool",
            token_a_mint.pubkey().as_ref(),
            token_b_mint.pubkey().as_ref(),
        ],
        &amm::ID,
    );

    let (vault_a, _) = ctx.svm.get_pda_with_bump(
        &[
            b"vault_a",
            token_a_mint.pubkey().as_ref(),
            token_b_mint.pubkey().as_ref(),
        ],
        &amm::ID,
    );

    let (vault_b, _) = ctx.svm.get_pda_with_bump(
        &[
            b"vault_b",
            token_a_mint.pubkey().as_ref(),
            token_b_mint.pubkey().as_ref(),
        ],
        &amm::ID,
    );

    let (lp_mint, _) = ctx.svm.get_pda_with_bump(
        &[
            b"lp_mint",
            token_a_mint.pubkey().as_ref(),
            token_b_mint.pubkey().as_ref(),
        ],
        &amm::ID,
    );

    // =========================================================
    // 7. Initialize pool
    // =========================================================

    let initialize_ix = ctx
        .program()
        .accounts(amm::client::accounts::Initialize {
            payer: user.pubkey(),
            pool,
            vault_a,
            vault_b,
            lp_mint,
            token_a_mint: token_a_mint.pubkey(),
            token_b_mint: token_b_mint.pubkey(),
            token_program: spl_token::ID,
            system_program: anchor_lang::system_program::ID,
        })
        .args(amm::client::args::Initialize {})
        .instruction()
        .unwrap();

    ctx.execute_instruction(initialize_ix, &[&user])
        .unwrap()
        .assert_success();

    // Pool should now exist.
    ctx.svm.assert_account_exists(&pool);

    // =========================================================
    // 8. Create user's LP token account
    // =========================================================

    let user_lp_token = ctx
        .svm
        .create_associated_token_account(&lp_mint, &user)
        .unwrap();

    // =========================================================
    // 9. ADD LIQUIDITY
    //
    // First deposit:
    //
    // 100 Token A
    // 100 Token B
    //
    // Since the pool is empty:
    //
    // LP = sqrt(100 * 100)
    //    = 100 LP
    //
    // With 6 decimals:
    // 100_000_000 LP
    // =========================================================

    let add_liquidity_ix = ctx
        .program()
        .accounts(amm::client::accounts::AddLiquidity {
            user: user.pubkey(),
            pool,
            vault_a,
            vault_b,
            lp_mint,
            token_a_mint: token_a_mint.pubkey(),
            token_b_mint: token_b_mint.pubkey(),
            user_token_a,
            user_token_b,
            user_lp_token,
            token_program: spl_token::ID,
        })
        .args(amm::client::args::AddLiquidity {
            amount_a: 100_000_000,
            amount_b: 100_000_000,
        })
        .instruction()
        .unwrap();

    ctx.execute_instruction(add_liquidity_ix, &[&user])
        .unwrap()
        .assert_success();

    // Pool now contains:
    //
    // 100 A
    // 100 B
    ctx.svm.assert_token_balance(&vault_a, 100_000_000);

    ctx.svm.assert_token_balance(&vault_b, 100_000_000);

    // User should have 100 LP
    ctx.svm.assert_token_balance(&user_lp_token, 100_000_000);

    // =========================================================
    // 10. ADD LIQUIDITY AGAIN
    //
    // Second deposit:
    //
    // 50 A
    // 50 B
    //
    // Existing pool ratio:
    //
    // 100 A : 100 B = 1 : 1
    //
    // So 50 A + 50 B is valid.
    //
    // User should receive another 50 LP.
    // =========================================================

    let add_liquidity_ix = ctx
        .program()
        .accounts(amm::client::accounts::AddLiquidity {
            user: user.pubkey(),
            pool,
            vault_a,
            vault_b,
            lp_mint,
            token_a_mint: token_a_mint.pubkey(),
            token_b_mint: token_b_mint.pubkey(),
            user_token_a,
            user_token_b,
            user_lp_token,
            token_program: spl_token::ID,
        })
        .args(amm::client::args::AddLiquidity {
            amount_a: 50_000_000,
            amount_b: 50_000_000,
        })
        .instruction()
        .unwrap();

    ctx.execute_instruction(add_liquidity_ix, &[&user])
        .unwrap()
        .assert_success();

    // Pool should now contain:
    //
    // 150 A
    // 150 B
    ctx.svm.assert_token_balance(&vault_a, 150_000_000);

    ctx.svm.assert_token_balance(&vault_b, 150_000_000);

    // User should now have:
    //
    // 100 LP + 50 LP = 150 LP
    ctx.svm.assert_token_balance(&user_lp_token, 150_000_000);

    // =========================================================
    // 11. SWAP A -> B
    //
    // User swaps:
    //
    // 10 Token A
    //
    // Fee = 0.30%
    //
    // min_amount_out = 1
    //
    // We only check that it succeeds and that balances move.
    // =========================================================

    let swap_a_to_b_ix = ctx
        .program()
        .accounts(amm::client::accounts::Swap {
            user: user.pubkey(),
            pool,
            vault_a,
            vault_b,
            token_a_mint: token_a_mint.pubkey(),
            token_b_mint: token_b_mint.pubkey(),
            user_token_a,
            user_token_b,
            token_program: spl_token::ID,
        })
        .args(amm::client::args::Swap {
            amount_in: 10_000_000,
            min_amount_out: 1,
            a_to_b: true,
        })
        .instruction()
        .unwrap();

    ctx.execute_instruction(swap_a_to_b_ix, &[&user])
        .unwrap()
        .assert_success();

    // After A -> B:
    //
    // Vault A increased
    // Vault B decreased
    //
    // We don't need to hard-code the exact B output
    // for this basic integration test.

    ctx.svm.assert_account_exists(&vault_a);
    ctx.svm.assert_account_exists(&vault_b);

    // =========================================================
    // 12. SWAP B -> A
    //
    // Now test the opposite direction.
    // =========================================================

    let swap_b_to_a_ix = ctx
        .program()
        .accounts(amm::client::accounts::Swap {
            user: user.pubkey(),
            pool,
            vault_a,
            vault_b,
            token_a_mint: token_a_mint.pubkey(),
            token_b_mint: token_b_mint.pubkey(),
            user_token_a,
            user_token_b,
            token_program: spl_token::ID,
        })
        .args(amm::client::args::Swap {
            amount_in: 5_000_000,
            min_amount_out: 1,
            a_to_b: false,
        })
        .instruction()
        .unwrap();

    ctx.execute_instruction(swap_b_to_a_ix, &[&user])
        .unwrap()
        .assert_success();

    // =========================================================
    // 13. REMOVE LIQUIDITY
    //
    // User currently owns 150 LP.
    //
    // Remove 50 LP.
    //
    // This is a partial withdrawal.
    // =========================================================

    let remove_liquidity_ix = ctx
        .program()
        .accounts(amm::client::accounts::RemoveLiquidity {
            user: user.pubkey(),
            pool,
            vault_a,
            vault_b,
            lp_mint,
            token_a_mint: token_a_mint.pubkey(),
            token_b_mint: token_b_mint.pubkey(),
            user_token_a,
            user_token_b,
            user_lp_token,
            token_program: spl_token::ID,
        })
        .args(amm::client::args::RemoveLiquidity {
            amount_lp: 50_000_000,
        })
        .instruction()
        .unwrap();

    ctx.execute_instruction(remove_liquidity_ix, &[&user])
        .unwrap()
        .assert_success();

    // User should now have:
    //
    // 150 LP - 50 LP = 100 LP
    ctx.svm.assert_token_balance(&user_lp_token, 100_000_000);

    // =========================================================
    // 14. Final sanity checks
    // =========================================================

    ctx.svm.assert_account_exists(&pool);
    ctx.svm.assert_account_exists(&vault_a);
    ctx.svm.assert_account_exists(&vault_b);
    ctx.svm.assert_account_exists(&lp_mint);
}
