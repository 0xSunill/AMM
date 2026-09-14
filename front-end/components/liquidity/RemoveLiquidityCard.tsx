"use client";

import { useState, useCallback, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAmmProgram } from "@/hooks/useAmmProgram";
import { usePool } from "@/hooks/usePool";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useTransactionState } from "@/hooks/useTransactionState";
import {
  parseTokenAmount,
  formatTokenAmount,
  calculateRemoveLiquidityAmounts,
} from "@/lib/solana/math";
import { getAssociatedTokenAddress } from "@/lib/solana/tokens";
import { TOKEN_PROGRAM_ID } from "@/lib/solana/constants";
import { TokenInput } from "../swap/TokenInput";
import { TransactionStatus } from "../ui/TransactionStatus";

const PERCENTAGE_PRESETS = [25, 50, 75, 100];

interface RemoveLiquidityCardProps {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenASymbol: string;
  tokenBSymbol: string;
}

export function RemoveLiquidityCard({
  tokenAMint,
  tokenBMint,
  tokenASymbol,
  tokenBSymbol,
}: RemoveLiquidityCardProps) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useAmmProgram();
  const { poolData, loading: poolLoading, refresh: refreshPool } = usePool(tokenAMint, tokenBMint);
  const balances = useTokenBalances(
    tokenAMint,
    tokenBMint,
    poolData?.pool.lpTokenMint ?? null
  );

  const [lpAmount, setLpAmount] = useState("");
  const txState = useTransactionState();

  const lpDecimals = poolData?.lpDecimals ?? 6;
  const decimalsA = poolData?.tokenADecimals ?? 6;
  const decimalsB = poolData?.tokenBDecimals ?? 6;

  const rawLp = useMemo(() => {
    if (!lpAmount || lpAmount === ".") return 0n;
    try { return parseTokenAmount(lpAmount, lpDecimals); } catch { return 0n; }
  }, [lpAmount, lpDecimals]);

  const removeEstimate = useMemo(() => {
    if (!poolData || rawLp <= 0n) return null;
    return calculateRemoveLiquidityAmounts(
      rawLp,
      poolData.reserveA,
      poolData.reserveB,
      poolData.lpSupply
    );
  }, [poolData, rawLp]);

  const percentageOfPosition = useMemo(() => {
    if (balances.lp <= 0n || rawLp <= 0n) return 0;
    return Number((rawLp * 10000n) / balances.lp) / 100;
  }, [rawLp, balances.lp]);

  const handlePercentage = useCallback(
    (pct: number) => {
      if (balances.lp <= 0n) return;
      const amount = (balances.lp * BigInt(pct)) / 100n;
      setLpAmount(formatTokenAmount(amount, lpDecimals));
    },
    [balances.lp, lpDecimals]
  );

  const handleRemoveLiquidity = useCallback(async () => {
    if (!program || !publicKey || !poolData || rawLp <= 0n) return;

    await txState.execute(async () => {
      const userTokenA = getAssociatedTokenAddress(publicKey, tokenAMint);
      const userTokenB = getAssociatedTokenAddress(publicKey, tokenBMint);
      const userLpToken = getAssociatedTokenAddress(publicKey, poolData.pool.lpTokenMint);

      const tx = await program.methods
        .removeLiquidity(new BN(rawLp.toString()))
        .accounts({
          user: publicKey,
          pool: poolData.poolAddress,
          vaultA: poolData.pool.tokenAVault,
          vaultB: poolData.pool.tokenBVault,
          lpMint: poolData.pool.lpTokenMint,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          userTokenA,
          userTokenB,
          userLpToken,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      await Promise.all([balances.refresh(), refreshPool()]);
      return tx;
    });

    setLpAmount("");
  }, [program, publicKey, poolData, rawLp, txState, tokenAMint, tokenBMint, balances, refreshPool]);

  const isDisabled =
    !publicKey ||
    !program ||
    !poolData ||
    rawLp <= 0n ||
    rawLp > balances.lp ||
    txState.state === "preparing" ||
    txState.state === "awaiting_approval" ||
    txState.state === "submitting" ||
    txState.state === "confirming";

  const buttonLabel = useMemo(() => {
    if (!publicKey) return "Connect Wallet";
    if (poolLoading) return "Loading Pool…";
    if (!poolData) return "Pool Not Found";
    if (balances.lp <= 0n) return "No LP Tokens";
    if (rawLp <= 0n) return "Enter Amount";
    if (rawLp > balances.lp) return "Exceeds LP Balance";
    if (txState.state !== "idle" && txState.state !== "success" && txState.state !== "error")
      return "Removing Liquidity…";
    return "Remove Liquidity";
  }, [publicKey, poolLoading, poolData, rawLp, balances.lp, txState.state]);

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in">
      <h2 className="text-lg font-bold text-text-primary mb-6">Remove Liquidity</h2>

      {/* LP Balance info */}
      <div className="mb-4 p-3 rounded-xl bg-bg-primary/50 flex items-center justify-between">
        <span className="text-xs text-text-muted">Your LP Tokens</span>
        <span className="text-sm font-semibold text-text-primary">
          {formatTokenAmount(balances.lp, lpDecimals, 6)}
        </span>
      </div>

      {/* Percentage presets */}
      <div className="flex gap-2 mb-4">
        {PERCENTAGE_PRESETS.map((pct) => (
          <button
            key={pct}
            onClick={() => handlePercentage(pct)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              Math.abs(percentageOfPosition - pct) < 0.5
                ? "bg-accent-primary/15 text-accent-secondary border border-accent-primary/30"
                : "bg-bg-secondary text-text-muted hover:text-text-secondary border border-border-subtle hover:border-border-default"
            }`}
            disabled={balances.lp <= 0n}
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* LP amount input */}
      <TokenInput
        label="LP Tokens to Burn"
        symbol="LP"
        value={lpAmount}
        onChange={setLpAmount}
        balance={balances.lp}
        decimals={lpDecimals}
        showMax
      />

      {/* Expected output */}
      {removeEstimate && rawLp > 0n && (
        <div className="mt-4 space-y-2 p-3 rounded-xl bg-bg-primary/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Position Removed</span>
            <span className="text-text-secondary font-medium">
              {percentageOfPosition.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{tokenASymbol} to Receive</span>
            <span className="text-success font-medium">
              {formatTokenAmount(removeEstimate.amountA, decimalsA, 6)} {tokenASymbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{tokenBSymbol} to Receive</span>
            <span className="text-success font-medium">
              {formatTokenAmount(removeEstimate.amountB, decimalsB, 6)} {tokenBSymbol}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={publicKey ? handleRemoveLiquidity : () => setVisible(true)}
        disabled={publicKey ? isDisabled : false}
        className="btn-primary mt-5"
      >
        {buttonLabel}
      </button>

      <TransactionStatus status={txState} onDismiss={txState.reset} />
    </div>
  );
}
