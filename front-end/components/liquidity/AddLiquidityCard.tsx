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
  calculateProportionalAmountB,
  calculateInitialLpTokens,
  calculateProportionalLpTokens,
  isProportionalDeposit,
} from "@/lib/solana/math";
import { getAssociatedTokenAddress } from "@/lib/solana/tokens";
import { TOKEN_PROGRAM_ID } from "@/lib/solana/constants";
import { TokenInput } from "../swap/TokenInput";
import { TransactionStatus } from "../ui/TransactionStatus";

interface AddLiquidityCardProps {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenASymbol: string;
  tokenBSymbol: string;
}

export function AddLiquidityCard({
  tokenAMint,
  tokenBMint,
  tokenASymbol,
  tokenBSymbol,
}: AddLiquidityCardProps) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useAmmProgram();
  const { poolData, loading: poolLoading, refresh: refreshPool } = usePool(tokenAMint, tokenBMint);
  const balances = useTokenBalances(
    tokenAMint,
    tokenBMint,
    poolData?.pool.lpTokenMint ?? null
  );

  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const txState = useTransactionState();

  const decimalsA = poolData?.tokenADecimals ?? 6;
  const decimalsB = poolData?.tokenBDecimals ?? 6;

  const rawA = useMemo(() => {
    if (!amountA || amountA === ".") return 0n;
    try { return parseTokenAmount(amountA, decimalsA); } catch { return 0n; }
  }, [amountA, decimalsA]);

  const rawB = useMemo(() => {
    if (!amountB || amountB === ".") return 0n;
    try { return parseTokenAmount(amountB, decimalsB); } catch { return 0n; }
  }, [amountB, decimalsB]);

  const isInitialDeposit = poolData ? poolData.lpSupply === 0n : false;

  // Auto-calculate amount B when pool exists and user changes amount A
  const handleAmountAChange = useCallback(
    (val: string) => {
      setAmountA(val);
      if (poolData && !isInitialDeposit && val && val !== ".") {
        try {
          const parsedA = parseTokenAmount(val, decimalsA);
          if (parsedA > 0n && poolData.reserveA > 0n) {
            const requiredB = calculateProportionalAmountB(
              parsedA,
              poolData.reserveA,
              poolData.reserveB
            );
            setAmountB(formatTokenAmount(requiredB, decimalsB));
          }
        } catch {
          // Don't update B on parse error
        }
      }
    },
    [poolData, isInitialDeposit, decimalsA, decimalsB]
  );

  // Auto-calculate amount A when user changes amount B
  const handleAmountBChange = useCallback(
    (val: string) => {
      setAmountB(val);
      if (poolData && !isInitialDeposit && val && val !== ".") {
        try {
          const parsedB = parseTokenAmount(val, decimalsB);
          if (parsedB > 0n && poolData.reserveB > 0n) {
            const requiredA = calculateProportionalAmountB(
              parsedB,
              poolData.reserveB,
              poolData.reserveA
            );
            setAmountA(formatTokenAmount(requiredA, decimalsA));
          }
        } catch {
          // Don't update A on parse error
        }
      }
    },
    [poolData, isInitialDeposit, decimalsA, decimalsB]
  );

  // Proportional check
  const isProportional = useMemo(() => {
    if (isInitialDeposit || !poolData || rawA <= 0n || rawB <= 0n) return true;
    return isProportionalDeposit(rawA, rawB, poolData.reserveA, poolData.reserveB);
  }, [isInitialDeposit, poolData, rawA, rawB]);

  // Expected LP tokens
  const expectedLp = useMemo(() => {
    if (!poolData || rawA <= 0n || rawB <= 0n) return 0n;
    if (isInitialDeposit) {
      return calculateInitialLpTokens(rawA, rawB);
    }
    return calculateProportionalLpTokens(rawA, poolData.reserveA, poolData.lpSupply);
  }, [poolData, rawA, rawB, isInitialDeposit]);

  const handleAddLiquidity = useCallback(async () => {
    if (!program || !publicKey || !poolData || rawA <= 0n || rawB <= 0n) return;

    await txState.execute(async () => {
      const userTokenA = getAssociatedTokenAddress(publicKey, tokenAMint);
      const userTokenB = getAssociatedTokenAddress(publicKey, tokenBMint);
      const userLpToken = getAssociatedTokenAddress(publicKey, poolData.pool.lpTokenMint);

      const tx = await program.methods
        .addLiquidity(new BN(rawA.toString()), new BN(rawB.toString()))
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

    setAmountA("");
    setAmountB("");
  }, [program, publicKey, poolData, rawA, rawB, txState, tokenAMint, tokenBMint, balances, refreshPool]);

  const isDisabled =
    !publicKey ||
    !program ||
    !poolData ||
    rawA <= 0n ||
    rawB <= 0n ||
    !isProportional ||
    rawA > balances.tokenA ||
    rawB > balances.tokenB ||
    txState.state === "preparing" ||
    txState.state === "awaiting_approval" ||
    txState.state === "submitting" ||
    txState.state === "confirming";

  const buttonLabel = useMemo(() => {
    if (!publicKey) return "Connect Wallet";
    if (poolLoading) return "Loading Pool…";
    if (!poolData) return "Pool Not Found";
    if (rawA <= 0n || rawB <= 0n) return "Enter Amounts";
    if (!isProportional) return "Invalid Ratio";
    if (rawA > balances.tokenA) return `Insufficient ${tokenASymbol}`;
    if (rawB > balances.tokenB) return `Insufficient ${tokenBSymbol}`;
    if (txState.state !== "idle" && txState.state !== "success" && txState.state !== "error")
      return "Adding Liquidity…";
    return "Add Liquidity";
  }, [publicKey, poolLoading, poolData, rawA, rawB, isProportional, balances, tokenASymbol, tokenBSymbol, txState.state]);

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in">
      <h2 className="text-lg font-bold text-text-primary mb-6">Add Liquidity</h2>

      <div className="space-y-3">
        <TokenInput
          label={tokenASymbol}
          symbol={tokenASymbol}
          value={amountA}
          onChange={handleAmountAChange}
          balance={publicKey ? balances.tokenA : undefined}
          decimals={decimalsA}
          showMax
        />

        <div className="flex justify-center">
          <div className="h-8 w-8 rounded-lg bg-bg-secondary border border-border-subtle flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-muted">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>

        <TokenInput
          label={tokenBSymbol}
          symbol={tokenBSymbol}
          value={amountB}
          onChange={isInitialDeposit ? handleAmountBChange : handleAmountBChange}
          balance={publicKey ? balances.tokenB : undefined}
          decimals={decimalsB}
          showMax={isInitialDeposit}
        />
      </div>

      {/* Ratio warning */}
      {!isProportional && rawA > 0n && rawB > 0n && (
        <div className="mt-3 p-3 rounded-xl bg-warning-bg border border-warning/20">
          <p className="text-xs text-warning font-medium">
            ⚠ Deposit ratio does not match the pool ratio. The amounts must be exactly proportional.
          </p>
        </div>
      )}

      {/* Info */}
      {poolData && (
        <div className="mt-4 space-y-2 p-3 rounded-xl bg-bg-primary/50">
          {poolData.reserveA > 0n && poolData.reserveB > 0n && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Pool Ratio</span>
              <span className="text-text-secondary font-medium">
                1 {tokenASymbol} ={" "}
                {(
                  Number(poolData.reserveB * 10n ** BigInt(decimalsA)) /
                  Number(poolData.reserveA * 10n ** BigInt(decimalsB))
                ).toFixed(6)}{" "}
                {tokenBSymbol}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Pool Reserves</span>
            <span className="text-text-secondary font-medium">
              {formatTokenAmount(poolData.reserveA, decimalsA, 4)} {tokenASymbol} /{" "}
              {formatTokenAmount(poolData.reserveB, decimalsB, 4)} {tokenBSymbol}
            </span>
          </div>
          {expectedLp > 0n && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">LP Tokens to Receive</span>
              <span className="text-accent-secondary font-medium">
                {formatTokenAmount(expectedLp, poolData.lpDecimals, 6)}
              </span>
            </div>
          )}
          {isInitialDeposit && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Type</span>
              <span className="text-cyan font-medium">Initial Deposit</span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={publicKey ? handleAddLiquidity : () => setVisible(true)}
        disabled={publicKey ? isDisabled : false}
        className="btn-primary mt-5"
      >
        {buttonLabel}
      </button>

      <TransactionStatus status={txState} onDismiss={txState.reset} />
    </div>
  );
}
