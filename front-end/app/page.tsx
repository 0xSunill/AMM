"use client";

import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { SwapCard } from "@/components/swap/SwapCard";
import { PoolStats } from "@/components/pool/PoolStats";

/**
 * Pool token mint addresses.
 * In a production app these would come from a pool registry or user selection.
 * For now, configure them here or via environment variables.
 */
const TOKEN_A_MINT = process.env.NEXT_PUBLIC_TOKEN_A_MINT || "";
const TOKEN_B_MINT = process.env.NEXT_PUBLIC_TOKEN_B_MINT || "";

export default function SwapPage() {
  const tokenAMint = useMemo(() => {
    try { return new PublicKey(TOKEN_A_MINT); } catch { return null; }
  }, []);
  const tokenBMint = useMemo(() => {
    try { return new PublicKey(TOKEN_B_MINT); } catch { return null; }
  }, []);

  return (
    <div className="py-8 sm:py-12 px-4">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
          Swap Tokens{" "}
          <span className="bg-gradient-to-r from-accent-primary to-cyan bg-clip-text text-transparent">
            Instantly
          </span>
        </h1>
        <p className="text-text-muted text-sm sm:text-base max-w-md mx-auto">
          Trade tokens with minimal fees on Solana's fastest AMM
        </p>
      </div>

      {!tokenAMint || !tokenBMint ? (
        <MintConfigPrompt />
      ) : (
        <>
          {/* Swap Card */}
          <SwapCard
            tokenAMint={tokenAMint}
            tokenBMint={tokenBMint}
            tokenASymbol="TKA"
            tokenBSymbol="TKB"
          />

          {/* Pool Summary */}
          <div className="mt-8 max-w-md mx-auto">
            <PoolStats
              tokenAMint={tokenAMint}
              tokenBMint={tokenBMint}
              tokenASymbol="TKA"
              tokenBSymbol="TKB"
              compact
            />
          </div>
        </>
      )}
    </div>
  );
}

function MintConfigPrompt() {
  return (
    <div className="glass-card p-8 max-w-lg mx-auto text-center">
      <div className="h-14 w-14 rounded-2xl bg-warning-bg border border-warning/20 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-text-primary mb-2">Configure Token Mints</h2>
      <p className="text-sm text-text-muted mb-4">
        Add your token mint addresses to <code className="text-accent-secondary font-mono text-xs bg-bg-input px-1.5 py-0.5 rounded">.env.local</code> to get started:
      </p>
      <div className="text-left bg-bg-input border border-border-subtle rounded-xl p-4">
        <pre className="text-xs font-mono text-text-secondary overflow-x-auto">
{`NEXT_PUBLIC_TOKEN_A_MINT=<your_token_a_mint>
NEXT_PUBLIC_TOKEN_B_MINT=<your_token_b_mint>`}
        </pre>
      </div>
      <p className="text-xs text-text-dimmed mt-3">
        These should be the SPL token mints used when initializing your AMM pool.
      </p>
    </div>
  );
}
