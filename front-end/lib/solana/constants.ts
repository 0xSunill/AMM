import { PublicKey, clusterApiUrl } from "@solana/web3.js";

/** AMM Program ID */
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_AMM_PROGRAM_ID ||
    "6gi14ywqAw7HR8kUUrRaK8dkXNdW2PyRifZT1nMkbct2"
);

/** PDA seed constants — must exactly match the Anchor program */
export const POOL_SEED = Buffer.from("pool");
export const VAULT_A_SEED = Buffer.from("vault_a");
export const VAULT_B_SEED = Buffer.from("vault_b");
export const LP_MINT_SEED = Buffer.from("lp_mint");

/** SPL Token Program */
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

/** Associated Token Program */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

/** Network configuration */
export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "testnet" | "mainnet-beta") ||
  "devnet";

/** RPC endpoint */
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

/** Solana Explorer URL builder */
export function getExplorerUrl(
  address: string,
  type: "address" | "tx" = "address"
): string {
  const base = "https://explorer.solana.com";
  const cluster = SOLANA_NETWORK === "mainnet-beta" ? "" : `?cluster=${SOLANA_NETWORK}`;
  return `${base}/${type}/${address}${cluster}`;
}

/** Default slippage tolerance in basis points */
export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

/** Pool state refresh interval in milliseconds */
export const POOL_REFRESH_INTERVAL = 15_000;
