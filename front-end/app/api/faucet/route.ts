import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
// @ts-expect-error — bs58 has no type declarations bundled
import bs58 from "bs58";

// ── Configuration ───────────────────────────────────────────────────────────

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

const TOKEN_A_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_TOKEN_A_MINT || "BB8WdukvrDPgpzzncbbHHQFRfyumAkRNGN4j2tejbJNK"
);
const TOKEN_B_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_TOKEN_B_MINT || "quKyqwU1hwgcUwEFVQaPrhANn2f7TCqptzpH9Q58kRV"
);

/** Standard SPL Token Program */
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/** Amount to mint per faucet request (1000 tokens with 6 decimals) */
const FAUCET_AMOUNT = 1000 * 10 ** 6;

/** Cooldown per wallet in milliseconds (60 seconds) */
const COOLDOWN_MS = 60_000;

// ── In-memory rate limiter ──────────────────────────────────────────────────

const lastRequestMap = new Map<string, number>();

function checkCooldown(wallet: string): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  const last = lastRequestMap.get(wallet);
  if (last && now - last < COOLDOWN_MS) {
    return { allowed: false, remainingMs: COOLDOWN_MS - (now - last) };
  }
  return { allowed: true, remainingMs: 0 };
}

function recordRequest(wallet: string) {
  lastRequestMap.set(wallet, Date.now());

  // Cleanup old entries to prevent memory leak (keep max 1000)
  if (lastRequestMap.size > 1000) {
    const cutoff = Date.now() - COOLDOWN_MS;
    for (const [key, time] of lastRequestMap) {
      if (time < cutoff) lastRequestMap.delete(key);
    }
  }
}

// ── Load faucet keypair ─────────────────────────────────────────────────────

function getFaucetKeypair(): Keypair {
  const privateKey = process.env.FAUCET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("FAUCET_PRIVATE_KEY is not configured");
  }
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}

// ── Confirm via polling (no WebSocket needed) ───────────────────────────────

async function confirmTransactionPolling(
  connection: Connection,
  signature: string,
  timeoutMs = 30_000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value?.[0];
    if (status) {
      if (status.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        return;
      }
    }
    // Wait 2 seconds before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Transaction confirmation timed out");
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { success: false, message: "walletAddress is required" },
        { status: 400 }
      );
    }

    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(walletAddress);
      // Verify it's on the ed25519 curve (valid wallet address)
      if (!PublicKey.isOnCurve(userPublicKey.toBytes())) {
        throw new Error("Not on curve");
      }
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Check cooldown
    const cooldown = checkCooldown(walletAddress);
    if (!cooldown.allowed) {
      const remainingSec = Math.ceil(cooldown.remainingMs / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${remainingSec}s before requesting again`,
        },
        { status: 429 }
      );
    }

    // Load faucet keypair
    let faucetKeypair: Keypair;
    try {
      faucetKeypair = getFaucetKeypair();
    } catch {
      return NextResponse.json(
        { success: false, message: "Faucet is not configured. See server logs." },
        { status: 500 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");

    // Derive ATAs for the user
    const [ataA, ataB] = await Promise.all([
      getAssociatedTokenAddress(TOKEN_A_MINT, userPublicKey),
      getAssociatedTokenAddress(TOKEN_B_MINT, userPublicKey),
    ]);

    // Build a single transaction: create ATAs (idempotent) + mint both tokens
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: faucetKeypair.publicKey,
    });

    // Create ATAs if they don't exist (idempotent — no-op if they already exist)
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        faucetKeypair.publicKey, // payer
        ataA,
        userPublicKey,
        TOKEN_A_MINT,
        TOKEN_PROGRAM_ID
      )
    );
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        faucetKeypair.publicKey, // payer
        ataB,
        userPublicKey,
        TOKEN_B_MINT,
        TOKEN_PROGRAM_ID
      )
    );

    // Mint 1000 TKA and 1000 TKB
    tx.add(
      createMintToInstruction(
        TOKEN_A_MINT,
        ataA,
        faucetKeypair.publicKey, // mint authority
        FAUCET_AMOUNT,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    tx.add(
      createMintToInstruction(
        TOKEN_B_MINT,
        ataB,
        faucetKeypair.publicKey, // mint authority
        FAUCET_AMOUNT,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Sign and send (skipPreflight=false for simulation check)
    tx.sign(faucetKeypair);
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Confirm via polling (avoids WebSocket which Alchemy doesn't support)
    await confirmTransactionPolling(connection, signature);

    // Record the request for cooldown
    recordRequest(walletAddress);

    return NextResponse.json({
      success: true,
      message: "Minted 1,000 TKA and 1,000 TKB to your wallet",
      signature,
    });
  } catch (err) {
    console.error("Faucet error:", err);
    const message = err instanceof Error ? err.message : "Faucet request failed";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
