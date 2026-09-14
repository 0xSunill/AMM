/**
 * TypeScript types for the AMM program IDL.
 */

import { PublicKey } from "@solana/web3.js";

/** On-chain PoolState account structure */
export interface PoolState {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  lpTokenMint: PublicKey;
  feeBps: number;
  bump: number;
}

/** Enriched pool data with reserve and supply information */
export interface PoolData {
  pool: PoolState;
  poolAddress: PublicKey;
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  tokenADecimals: number;
  tokenBDecimals: number;
  lpDecimals: number;
}

/** Swap quote result for UI display */
export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
  priceImpact: number;
  minimumReceived: bigint;
  exchangeRate: number;
}

/** Transaction lifecycle states */
export type TransactionState =
  | "idle"
  | "preparing"
  | "awaiting_approval"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

/** Transaction status info */
export interface TransactionStatus {
  state: TransactionState;
  txSignature: string | null;
  errorMessage: string | null;
  errorDetails: string | null;
}

/** Token info for display */
export interface TokenInfo {
  symbol: string;
  mint: PublicKey;
  decimals: number;
}
