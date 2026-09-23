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

// ── Vercel-compatible: max function duration ─────────────────────────────────
// Vercel Hobby = 10s, Pro = 60s. Set this to stay within limits.
export const maxDuration = 10;

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

    // Sign and send — preflight simulation catches most errors
    // We skip waiting for full confirmation to stay within Vercel's timeout limit.
    // The preflight simulation (skipPreflight: false) validates the tx will succeed.
    tx.sign(faucetKeypair);
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

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
