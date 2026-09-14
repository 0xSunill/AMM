"use client";

import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTokenBalances, formatSol } from "@/hooks/useTokenBalances";
import { formatTokenAmount } from "@/lib/solana/math";
import { getExplorerUrl } from "@/lib/solana/constants";
import { AddressDisplay } from "./AddressDisplay";

interface WalletInfoProps {
  tokenAMint: PublicKey | null;
  tokenBMint: PublicKey | null;
  lpMint: PublicKey | null;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenADecimals: number;
  tokenBDecimals: number;
  lpDecimals: number;
}

export function WalletInfo({
  tokenAMint,
  tokenBMint,
  lpMint,
  tokenASymbol,
  tokenBSymbol,
  tokenADecimals,
  tokenBDecimals,
  lpDecimals,
}: WalletInfoProps) {
  const { publicKey } = useWallet();
  const balances = useTokenBalances(tokenAMint, tokenBMint, lpMint);

  if (!publicKey) {
    return (
      <div className="glass-card-sm p-4">
        <p className="text-sm text-text-muted text-center">Connect wallet to view balances</p>
      </div>
    );
  }

  return (
    <div className="glass-card-sm p-4 space-y-3 animate-fade-in">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Your Wallet</h3>

      <AddressDisplay
        label="Address"
        address={publicKey.toBase58()}
        explorerUrl={getExplorerUrl(publicKey.toBase58())}
      />

      <div className="h-px bg-border-subtle" />

      <div className="space-y-2">
        <BalanceRow label="SOL" value={formatSol(balances.sol)} />
        <BalanceRow
          label={tokenASymbol}
          value={formatTokenAmount(balances.tokenA, tokenADecimals, 6)}
        />
        <BalanceRow
          label={tokenBSymbol}
          value={formatTokenAmount(balances.tokenB, tokenBDecimals, 6)}
        />
        <BalanceRow
          label="LP Tokens"
          value={formatTokenAmount(balances.lp, lpDecimals, 6)}
          accent
        />
      </div>

      {balances.loading && (
        <p className="text-xs text-text-dimmed text-center animate-pulse-soft">
          Updating…
        </p>
      )}
    </div>
  );
}

function BalanceRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`font-semibold ${accent ? "text-accent-secondary" : "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}
