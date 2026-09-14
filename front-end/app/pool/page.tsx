"use client";

import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { PoolStats } from "@/components/pool/PoolStats";
import { InitializePoolCard } from "@/components/pool/InitializePoolCard";
import { WalletInfo } from "@/components/ui/WalletInfo";
import { usePool } from "@/hooks/usePool";
import { DEFAULT_TOKEN_A_MINT, DEFAULT_TOKEN_B_MINT } from "@/lib/solana/constants";

const TOKEN_A_MINT = DEFAULT_TOKEN_A_MINT;
const TOKEN_B_MINT = DEFAULT_TOKEN_B_MINT;

export default function PoolPage() {
  const tokenAMint = useMemo(() => {
    try { return new PublicKey(TOKEN_A_MINT); } catch { return null; }
  }, []);
  const tokenBMint = useMemo(() => {
    try { return new PublicKey(TOKEN_B_MINT); } catch { return null; }
  }, []);

  if (!tokenAMint || !tokenBMint) {
    return (
      <div className="py-12 px-4">
        <div className="glass-card p-8 max-w-lg mx-auto text-center">
          <p className="text-text-muted">
            Configure token mints in <code className="text-accent-secondary font-mono text-xs">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return <PoolPageContent tokenAMint={tokenAMint} tokenBMint={tokenBMint} />;
}

function PoolPageContent({
  tokenAMint,
  tokenBMint,
}: {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
}) {
  const { poolData, loading, refresh } = usePool(tokenAMint, tokenBMint);

  return (
    <div className="py-8 sm:py-12 px-4">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
          Pool{" "}
          <span className="bg-gradient-to-r from-accent-primary to-cyan bg-clip-text text-transparent">
            Dashboard
          </span>
        </h1>
        <p className="text-text-muted text-sm sm:text-base max-w-md mx-auto">
          View pool reserves, exchange rates, and your position
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {!loading && !poolData && (
          <InitializePoolCard
            tokenAMint={tokenAMint}
            tokenBMint={tokenBMint}
            tokenASymbol="TKA"
            tokenBSymbol="TKB"
            onSuccess={refresh}
          />
        )}

        {/* Full pool stats */}
        <PoolStats
          tokenAMint={tokenAMint}
          tokenBMint={tokenBMint}
          tokenASymbol="TKA"
          tokenBSymbol="TKB"
        />

        {/* Wallet info */}
        <div className="max-w-md mx-auto">
          <WalletInfo
            tokenAMint={tokenAMint}
            tokenBMint={tokenBMint}
            lpMint={poolData?.pool.lpTokenMint ?? null}
            tokenASymbol="TKA"
            tokenBSymbol="TKB"
            tokenADecimals={poolData?.tokenADecimals ?? 6}
            tokenBDecimals={poolData?.tokenBDecimals ?? 6}
            lpDecimals={poolData?.lpDecimals ?? 6}
          />
        </div>
      </div>
    </div>
  );
}
