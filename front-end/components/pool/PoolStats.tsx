"use client";

import { PublicKey } from "@solana/web3.js";
import { usePool } from "@/hooks/usePool";
import { formatTokenAmount, calculateExchangeRate } from "@/lib/solana/math";
import { getExplorerUrl } from "@/lib/solana/constants";
import { AddressDisplay } from "../ui/AddressDisplay";

interface PoolStatsProps {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenASymbol: string;
  tokenBSymbol: string;
  compact?: boolean;
}

export function PoolStats({
  tokenAMint,
  tokenBMint,
  tokenASymbol,
  tokenBSymbol,
  compact = false,
}: PoolStatsProps) {
  const { poolData, loading, error } = usePool(tokenAMint, tokenBMint);

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse-soft">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
          <span className="text-sm text-text-muted">Loading pool data…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  if (!poolData) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-text-muted">Pool not found. It may need to be initialized.</p>
      </div>
    );
  }

  const { pool, poolAddress, reserveA, reserveB, lpSupply, tokenADecimals, tokenBDecimals, lpDecimals } = poolData;

  const rateAtoB = calculateExchangeRate(reserveA, reserveB, tokenADecimals, tokenBDecimals);
  const rateBtoA = rateAtoB > 0 ? 1 / rateAtoB : 0;
  const feePercent = (pool.feeBps / 100).toFixed(2);

  if (compact) {
    return (
      <div className="glass-card-sm p-4 space-y-2">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Pool Overview</h3>
        <StatRow label={`${tokenASymbol} Reserve`} value={formatTokenAmount(reserveA, tokenADecimals, 4)} />
        <StatRow label={`${tokenBSymbol} Reserve`} value={formatTokenAmount(reserveB, tokenBDecimals, 4)} />
        <StatRow label="LP Supply" value={formatTokenAmount(lpSupply, lpDecimals, 4)} />
        <StatRow
          label="Rate"
          value={`1 ${tokenASymbol} = ${rateAtoB.toFixed(6)} ${tokenBSymbol}`}
        />
        <StatRow label="Fee" value={`${feePercent}%`} />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 w-full max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-lg font-bold text-text-primary mb-6">Pool Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          label={`${tokenASymbol} Reserve`}
          value={formatTokenAmount(reserveA, tokenADecimals, 6)}
          sub={tokenASymbol}
        />
        <StatCard
          label={`${tokenBSymbol} Reserve`}
          value={formatTokenAmount(reserveB, tokenBDecimals, 6)}
          sub={tokenBSymbol}
        />
        <StatCard
          label="LP Supply"
          value={formatTokenAmount(lpSupply, lpDecimals, 6)}
          sub="LP Tokens"
        />
        <StatCard
          label="Trading Fee"
          value={`${feePercent}%`}
          sub={`${pool.feeBps} bps`}
        />
      </div>

      {/* Exchange rates */}
      <div className="p-4 rounded-xl bg-bg-primary/50 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Exchange Rates</h3>
        <div className="space-y-2">
          <StatRow
            label={`1 ${tokenASymbol}`}
            value={`${rateAtoB.toFixed(6)} ${tokenBSymbol}`}
          />
          <StatRow
            label={`1 ${tokenBSymbol}`}
            value={`${rateBtoA.toFixed(6)} ${tokenASymbol}`}
          />
        </div>
      </div>

      {/* Addresses */}
      <div className="p-4 rounded-xl bg-bg-primary/50 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Addresses</h3>
        <AddressDisplay
          label="Pool"
          address={poolAddress.toBase58()}
          explorerUrl={getExplorerUrl(poolAddress.toBase58())}
        />
        <AddressDisplay
          label="Vault A"
          address={pool.tokenAVault.toBase58()}
          explorerUrl={getExplorerUrl(pool.tokenAVault.toBase58())}
        />
        <AddressDisplay
          label="Vault B"
          address={pool.tokenBVault.toBase58()}
          explorerUrl={getExplorerUrl(pool.tokenBVault.toBase58())}
        />
        <AddressDisplay
          label="LP Mint"
          address={pool.lpTokenMint.toBase58()}
          explorerUrl={getExplorerUrl(pool.lpTokenMint.toBase58())}
        />
        <AddressDisplay
          label={tokenASymbol}
          address={pool.tokenAMint.toBase58()}
          explorerUrl={getExplorerUrl(pool.tokenAMint.toBase58())}
        />
        <AddressDisplay
          label={tokenBSymbol}
          address={pool.tokenBMint.toBase58()}
          explorerUrl={getExplorerUrl(pool.tokenBMint.toBase58())}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-bg-primary/50 border border-border-subtle">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-dimmed mt-0.5">{sub}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-secondary font-medium">{value}</span>
    </div>
  );
}
