"use client";

import { useMemo } from "react";
import {
  calculateSwapOutput,
  calculatePriceImpact,
  calculateMinReceived,
  calculateExchangeRate,
} from "@/lib/solana/math";
import type { SwapQuote } from "@/types/amm";

interface UseSwapQuoteParams {
  amountIn: bigint;
  reserveIn: bigint;
  reserveOut: bigint;
  feeBps: number;
  slippageBps: number;
  decimalsIn: number;
  decimalsOut: number;
}

/**
 * Calculates a swap quote for display purposes.
 * All values are derived from on-chain reserves using safe bigint math.
 */
export function useSwapQuote(params: UseSwapQuoteParams | null): SwapQuote | null {
  return useMemo(() => {
    if (!params) return null;

    const { amountIn, reserveIn, reserveOut, feeBps, slippageBps, decimalsIn, decimalsOut } =
      params;

    if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
      return null;
    }

    const { amountOut, fee } = calculateSwapOutput(
      amountIn,
      reserveIn,
      reserveOut,
      feeBps
    );

    const priceImpact = calculatePriceImpact(
      amountIn,
      reserveIn,
      reserveOut,
      feeBps
    );

    const minimumReceived = calculateMinReceived(amountOut, slippageBps);

    const exchangeRate = calculateExchangeRate(
      reserveIn,
      reserveOut,
      decimalsIn,
      decimalsOut
    );

    return {
      amountIn,
      amountOut,
      fee,
      priceImpact,
      minimumReceived,
      exchangeRate,
    };
  }, [params]);
}
