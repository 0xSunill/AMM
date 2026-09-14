"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAmmProgram } from "./useAmmProgram";
import { getPoolPda } from "@/lib/solana/pda";
import { getTokenAccountBalance, getMintSupply, getMintDecimals } from "@/lib/solana/tokens";
import { POOL_REFRESH_INTERVAL } from "@/lib/solana/constants";
import type { PoolData, PoolState } from "@/types/amm";

interface UsePoolResult {
  poolData: PoolData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches and caches the pool state, reserves, LP supply, and mint decimals.
 * Auto-refreshes every POOL_REFRESH_INTERVAL ms.
 */
export function usePool(
  tokenAMint: PublicKey | null,
  tokenBMint: PublicKey | null
): UsePoolResult {
  const { connection } = useConnection();
  const { readonlyProgram } = useAmmProgram();
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPool = useCallback(async () => {
    if (!tokenAMint || !tokenBMint || !readonlyProgram) {
      setPoolData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [poolAddress] = getPoolPda(tokenAMint, tokenBMint);

      // Fetch pool account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poolAccount = await (readonlyProgram.account as any).poolState.fetch(
        poolAddress
      );

      const pool: PoolState = {
        tokenAMint: poolAccount.tokenAMint,
        tokenBMint: poolAccount.tokenBMint,
        tokenAVault: poolAccount.tokenAVault,
        tokenBVault: poolAccount.tokenBVault,
        lpTokenMint: poolAccount.lpTokenMint,
        feeBps: poolAccount.feeBps,
        bump: poolAccount.bump,
      };

      // Fetch reserves, LP supply, and decimals in parallel
      const [reserveA, reserveB, lpSupply, tokenADecimals, tokenBDecimals, lpDecimals] =
        await Promise.all([
          getTokenAccountBalance(connection, pool.tokenAVault),
          getTokenAccountBalance(connection, pool.tokenBVault),
          getMintSupply(connection, pool.lpTokenMint),
          getMintDecimals(connection, pool.tokenAMint),
          getMintDecimals(connection, pool.tokenBMint),
          getMintDecimals(connection, pool.lpTokenMint),
        ]);

      setPoolData({
        pool,
        poolAddress,
        reserveA,
        reserveB,
        lpSupply,
        tokenADecimals,
        tokenBDecimals,
        lpDecimals,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch pool";
      setError(message);
      setPoolData(null);
    } finally {
      setLoading(false);
    }
  }, [tokenAMint, tokenBMint, connection, readonlyProgram]);

  useEffect(() => {
    fetchPool();

    intervalRef.current = setInterval(fetchPool, POOL_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPool]);

  return { poolData, loading, error, refresh: fetchPool };
}
