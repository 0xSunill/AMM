"use client";

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { AddLiquidityCard } from "@/components/liquidity/AddLiquidityCard";
import { RemoveLiquidityCard } from "@/components/liquidity/RemoveLiquidityCard";
import { PoolStats } from "@/components/pool/PoolStats";

const TOKEN_A_MINT = process.env.NEXT_PUBLIC_TOKEN_A_MINT || "";
const TOKEN_B_MINT = process.env.NEXT_PUBLIC_TOKEN_B_MINT || "";

type Tab = "add" | "remove";

export default function LiquidityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("add");

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
            Configure <code className="text-accent-secondary font-mono text-xs">NEXT_PUBLIC_TOKEN_A_MINT</code> and{" "}
            <code className="text-accent-secondary font-mono text-xs">NEXT_PUBLIC_TOKEN_B_MINT</code> in{" "}
            <code className="text-accent-secondary font-mono text-xs">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
          Manage{" "}
          <span className="bg-gradient-to-r from-accent-primary to-cyan bg-clip-text text-transparent">
            Liquidity
          </span>
        </h1>
        <p className="text-text-muted text-sm sm:text-base max-w-md mx-auto">
          Provide liquidity to earn trading fees from every swap
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-bg-secondary rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "add"
                ? "bg-accent-primary/15 text-accent-secondary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Add Liquidity
          </button>
          <button
            onClick={() => setActiveTab("remove")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "remove"
                ? "bg-accent-primary/15 text-accent-secondary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Remove Liquidity
          </button>
        </div>

        {/* Active card */}
        {activeTab === "add" ? (
          <AddLiquidityCard
            tokenAMint={tokenAMint}
            tokenBMint={tokenBMint}
            tokenASymbol="TKA"
            tokenBSymbol="TKB"
          />
        ) : (
          <RemoveLiquidityCard
            tokenAMint={tokenAMint}
            tokenBMint={tokenBMint}
            tokenASymbol="TKA"
            tokenBSymbol="TKB"
          />
        )}

        {/* Pool info */}
        <div className="mt-8">
          <PoolStats
            tokenAMint={tokenAMint}
            tokenBMint={tokenBMint}
            tokenASymbol="TKA"
            tokenBSymbol="TKB"
            compact
          />
        </div>
      </div>
    </div>
  );
}
