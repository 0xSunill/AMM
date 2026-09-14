import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID,
  POOL_SEED,
  VAULT_A_SEED,
  VAULT_B_SEED,
  LP_MINT_SEED,
} from "./constants";

/**
 * Derive the Pool PDA.
 * Seeds: ["pool", token_a_mint, token_b_mint]
 */
export function getPoolPda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, tokenAMint.toBuffer(), tokenBMint.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the Vault A PDA.
 * Seeds: ["vault_a", token_a_mint, token_b_mint]
 */
export function getVaultAPda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_A_SEED, tokenAMint.toBuffer(), tokenBMint.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the Vault B PDA.
 * Seeds: ["vault_b", token_a_mint, token_b_mint]
 */
export function getVaultBPda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_B_SEED, tokenAMint.toBuffer(), tokenBMint.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the LP Mint PDA.
 * Seeds: ["lp_mint", token_a_mint, token_b_mint]
 */
export function getLpMintPda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [LP_MINT_SEED, tokenAMint.toBuffer(), tokenBMint.toBuffer()],
    PROGRAM_ID
  );
}
