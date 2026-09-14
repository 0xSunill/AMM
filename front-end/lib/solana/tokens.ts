import { Connection, PublicKey } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "./constants";

/**
 * Derive the associated token account address for a given owner and mint.
 */
export function getAssociatedTokenAddress(
  owner: PublicKey,
  mint: PublicKey
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

/**
 * Fetch the decimals for a given mint.
 */
export async function getMintDecimals(
  connection: Connection,
  mint: PublicKey
): Promise<number> {
  const info = await connection.getParsedAccountInfo(mint);
  if (!info.value) {
    throw new Error(`Mint account not found: ${mint.toBase58()}`);
  }

  const data = info.value.data;
  if ("parsed" in data) {
    return data.parsed.info.decimals;
  }

  throw new Error(`Could not parse mint data: ${mint.toBase58()}`);
}

/**
 * Fetch the token balance for a given owner and mint.
 * Returns the raw amount as bigint.
 */
export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<bigint> {
  const ata = getAssociatedTokenAddress(owner, mint);

  try {
    const info = await connection.getParsedAccountInfo(ata);
    if (!info.value) return 0n;

    const data = info.value.data;
    if ("parsed" in data) {
      return BigInt(data.parsed.info.tokenAmount.amount);
    }

    return 0n;
  } catch {
    return 0n;
  }
}

/**
 * Fetch the token account balance directly from a token account address.
 * Returns the raw amount as bigint.
 */
export async function getTokenAccountBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<bigint> {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return BigInt(balance.value.amount);
  } catch {
    return 0n;
  }
}

/**
 * Fetch the supply of a mint.
 */
export async function getMintSupply(
  connection: Connection,
  mint: PublicKey
): Promise<bigint> {
  try {
    const supply = await connection.getTokenSupply(mint);
    return BigInt(supply.value.amount);
  } catch {
    return 0n;
  }
}
