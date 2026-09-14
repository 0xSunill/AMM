"use client";

import { useCallback, useState } from "react";
import type { TransactionState, TransactionStatus } from "@/types/amm";

/**
 * State machine for transaction lifecycle.
 * Wraps any async transaction function and tracks its state.
 */
export function useTransactionState(): TransactionStatus & {
  execute: (fn: () => Promise<string>) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<TransactionState>("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setTxSignature(null);
    setErrorMessage(null);
    setErrorDetails(null);
  }, []);

  const execute = useCallback(async (fn: () => Promise<string>) => {
    try {
      setState("preparing");
      setTxSignature(null);
      setErrorMessage(null);
      setErrorDetails(null);

      setState("awaiting_approval");

      const signature = await fn();

      setState("confirming");
      setTxSignature(signature);

      setState("success");
    } catch (err) {
      setState("error");

      const rawMessage = err instanceof Error ? err.message : String(err);

      // Parse user-friendly error messages
      const userMessage = parseErrorMessage(rawMessage);
      setErrorMessage(userMessage);
      setErrorDetails(rawMessage);
    }
  }, []);

  return { state, txSignature, errorMessage, errorDetails, execute, reset };
}

/**
 * Parse raw error messages into user-friendly ones.
 */
function parseErrorMessage(raw: string): string {
  // User rejected transaction
  if (
    raw.includes("User rejected") ||
    raw.includes("Transaction cancelled") ||
    raw.includes("user rejected")
  ) {
    return "Transaction cancelled by user";
  }

  // Insufficient SOL
  if (
    raw.includes("insufficient lamports") ||
    raw.includes("Attempt to debit an account but found no record of a prior credit")
  ) {
    return "Insufficient SOL for transaction fees";
  }

  // Insufficient token balance
  if (raw.includes("insufficient funds") || raw.includes("0x1")) {
    return "Insufficient token balance";
  }

  // Slippage exceeded (Anchor error code 6003)
  if (raw.includes("6003") || raw.includes("SlippageExceeded")) {
    return "Slippage tolerance exceeded. Try increasing your slippage setting.";
  }

  // Invalid amount (Anchor error code 6001)
  if (raw.includes("6001") || raw.includes("InvalidAmount")) {
    return "Invalid amount. The deposit ratio may not match the pool ratio.";
  }

  // Math overflow (Anchor error code 6000)
  if (raw.includes("6000") || raw.includes("MathOverflow")) {
    return "Calculation overflow. Try a smaller amount.";
  }

  // Insufficient liquidity (Anchor error code 6002)
  if (raw.includes("6002") || raw.includes("InsufficientLiquidity")) {
    return "Insufficient liquidity in the pool.";
  }

  // Burn amount errors
  if (raw.includes("6004") || raw.includes("BurnAmountMustBeGreaterThanZero")) {
    return "Burn amount must be greater than zero.";
  }
  if (raw.includes("6005") || raw.includes("LpSupplyMustNotBeZero")) {
    return "LP supply is zero. No liquidity to remove.";
  }
  if (raw.includes("6006") || raw.includes("BurnAmountMustNotExceedBalance")) {
    return "Burn amount exceeds your LP token balance.";
  }

  // Simulation failure
  if (raw.includes("Simulation failed") || raw.includes("simulation")) {
    return "Transaction simulation failed. Please try again.";
  }

  // RPC/Network error
  if (raw.includes("Network") || raw.includes("fetch") || raw.includes("timeout")) {
    return "Network error. Please check your connection and try again.";
  }

  // Account not found
  if (raw.includes("Account does not exist") || raw.includes("could not find account")) {
    return "Required account not found. The pool may not be initialized.";
  }

  // Fallback
  if (raw.length > 100) {
    return "Transaction failed. See details below.";
  }

  return raw;
}
