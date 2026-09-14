"use client";

import { useState, useCallback, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAmmProgram } from "@/hooks/useAmmProgram";
import { usePool } from "@/hooks/usePool";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useTransactionState } from "@/hooks/useTransactionState";
import { parseTokenAmount, formatTokenAmount, calculateMinReceived } from "@/lib/solana/math";
import { getAssociatedTokenAddress } from "@/lib/solana/tokens";
import { DEFAULT_SLIPPAGE_BPS, TOKEN_PROGRAM_ID } from "@/lib/solana/constants";
import { TokenInput } from "./TokenInput";
import { SlippageSelector } from "./SlippageSelector";
import { TransactionStatus } from "../ui/TransactionStatus";

interface SwapCardProps {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenASymbol: string;
  tokenBSymbol: string;
}

export function SwapCard({
  tokenAMint,
  tokenBMint,
  tokenASymbol,
  tokenBSymbol,
}: SwapCardProps) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useAmmProgram();
  const { poolData, loading: poolLoading, refresh: refreshPool } = usePool(tokenAMint, tokenBMint);
  const balances = useTokenBalances(
    tokenAMint,
    tokenBMint,
    poolData?.pool.lpTokenMint ?? null
  );

  const [aToB, setAToB] = useState(true);
  const [inputAmount, setInputAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const txState = useTransactionState();

  const inputMint = aToB ? tokenAMint : tokenBMint;
  const outputMint = aToB ? tokenBMint : tokenAMint;
  const inputSymbol = aToB ? tokenASymbol : tokenBSymbol;
  const outputSymbol = aToB ? tokenBSymbol : tokenASymbol;
  const inputDecimals = aToB
    ? (poolData?.tokenADecimals ?? 6)
    : (poolData?.tokenBDecimals ?? 6);
  const outputDecimals = aToB
    ? (poolData?.tokenBDecimals ?? 6)
    : (poolData?.tokenADecimals ?? 6);
  const inputBalance = aToB ? balances.tokenA : balances.tokenB;
  const outputBalance = aToB ? balances.tokenB : balances.tokenA;

  const amountInRaw = useMemo(() => {
    if (!inputAmount || inputAmount === ".") return 0n;
    try {
      return parseTokenAmount(inputAmount, inputDecimals);
    } catch {
      return 0n;
    }
  }, [inputAmount, inputDecimals]);

  const reserveIn = aToB ? (poolData?.reserveA ?? 0n) : (poolData?.reserveB ?? 0n);
  const reserveOut = aToB ? (poolData?.reserveB ?? 0n) : (poolData?.reserveA ?? 0n);

  const quote = useSwapQuote(
    poolData && amountInRaw > 0n
      ? {
          amountIn: amountInRaw,
          reserveIn,
          reserveOut,
          feeBps: poolData.pool.feeBps,
          slippageBps,
          decimalsIn: inputDecimals,
          decimalsOut: outputDecimals,
        }
      : null
  );

  const toggleDirection = useCallback(() => {
    setAToB((prev) => !prev);
    setInputAmount("");
    txState.reset();
  }, [txState]);

  const handleSwap = useCallback(async () => {
    if (!program || !publicKey || !poolData || !quote || amountInRaw <= 0n) return;

    const minOut = calculateMinReceived(quote.amountOut, slippageBps);

    await txState.execute(async () => {
      const userTokenA = getAssociatedTokenAddress(publicKey, tokenAMint);
      const userTokenB = getAssociatedTokenAddress(publicKey, tokenBMint);

      const tx = await program.methods
        .swap(new BN(amountInRaw.toString()), new BN(minOut.toString()), aToB)
        .accounts({
          user: publicKey,
          pool: poolData.poolAddress,
          vaultA: poolData.pool.tokenAVault,
          vaultB: poolData.pool.tokenBVault,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          userTokenA,
          userTokenB,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // Refresh data after swap
      await Promise.all([balances.refresh(), refreshPool()]);

      return tx;
    });

    setInputAmount("");
  }, [
    program, publicKey, poolData, quote, amountInRaw,
    slippageBps, aToB, txState, tokenAMint, tokenBMint,
    balances, refreshPool,
  ]);

  const isSubmitDisabled =
    !publicKey ||
    !program ||
    !poolData ||
    !quote ||
    amountInRaw <= 0n ||
    amountInRaw > inputBalance ||
    txState.state === "preparing" ||
    txState.state === "awaiting_approval" ||
    txState.state === "submitting" ||
    txState.state === "confirming";

  const buttonLabel = useMemo(() => {
    if (!publicKey) return "Connect Wallet";
    if (poolLoading) return "Loading Pool…";
    if (!poolData) return "Pool Not Found";
    if (!inputAmount || inputAmount === "." || amountInRaw <= 0n) return "Enter Amount";
    if (amountInRaw > inputBalance) return "Insufficient Balance";
    if (txState.state === "preparing" || txState.state === "awaiting_approval")
      return "Confirm in Wallet…";
    if (txState.state === "submitting" || txState.state === "confirming")
      return "Swapping…";
    return "Swap";
  }, [publicKey, poolLoading, poolData, inputAmount, amountInRaw, inputBalance, txState.state]);

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-text-primary">Swap</h2>
        <SlippageSelector value={slippageBps} onChange={setSlippageBps} />
      </div>

      {/* Input token */}
      <TokenInput
        label="You pay"
        symbol={inputSymbol}
        value={inputAmount}
        onChange={setInputAmount}
        balance={publicKey ? inputBalance : undefined}
        decimals={inputDecimals}
        showMax
        disabled={txState.state !== "idle" && txState.state !== "success" && txState.state !== "error"}
      />

      {/* Swap direction toggle */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={toggleDirection}
          className="h-10 w-10 rounded-xl bg-bg-secondary border-4 border-bg-primary flex items-center justify-center hover:bg-bg-card-hover hover:border-border-subtle transition-all duration-200 group"
          aria-label="Switch swap direction"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-text-muted group-hover:text-accent-secondary transition-colors group-hover:rotate-180 duration-300"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      </div>

      {/* Output token */}
      <TokenInput
        label="You receive"
        symbol={outputSymbol}
        value={
          quote
            ? formatTokenAmount(quote.amountOut, outputDecimals, 6)
            : ""
        }
        balance={publicKey ? outputBalance : undefined}
        decimals={outputDecimals}
        readOnly
      />

      {/* Swap details */}
      {quote && poolData && (
        <div className="mt-4 space-y-2 p-3 rounded-xl bg-bg-primary/50">
          <DetailRow
            label="Exchange Rate"
            value={`1 ${inputSymbol} ≈ ${quote.exchangeRate.toFixed(6)} ${outputSymbol}`}
          />
          <DetailRow
            label="Trading Fee"
            value={`${formatTokenAmount(quote.fee, inputDecimals, 6)} ${inputSymbol} (${(poolData.pool.feeBps / 100).toFixed(2)}%)`}
          />
          <DetailRow
            label="Price Impact"
            value={`${quote.priceImpact.toFixed(2)}%`}
            warning={quote.priceImpact > 5}
            danger={quote.priceImpact > 15}
          />
          <DetailRow
            label="Min. Received"
            value={`${formatTokenAmount(quote.minimumReceived, outputDecimals, 6)} ${outputSymbol}`}
          />
        </div>
      )}

      {/* Swap button */}
      <button
        onClick={publicKey ? handleSwap : () => setVisible(true)}
        disabled={publicKey ? isSubmitDisabled : false}
        className="btn-primary mt-5"
      >
        {buttonLabel}
      </button>

      {/* Transaction status */}
      <TransactionStatus status={txState} onDismiss={txState.reset} />
    </div>
  );
}

function DetailRow({
  label,
  value,
  warning = false,
  danger = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span
        className={`font-medium ${
          danger
            ? "text-error"
            : warning
            ? "text-warning"
            : "text-text-secondary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
