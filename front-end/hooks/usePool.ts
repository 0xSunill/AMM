"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
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

const decimalsCache = new Map<string, number>();

async function getCachedDecimals(connection: Connection, mint: PublicKey): Promise<number> {
  const key = mint.toBase58();
  const cached = decimalsCache.get(key);
  if (cached !== undefined) return cached;
  const dec = await getMintDecimals(connection, mint);
  decimalsCache.set(key, dec);
  return dec;
}
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
          getCachedDecimals(connection, pool.tokenAMint),
          getCachedDecimals(connection, pool.tokenBMint),
          getCachedDecimals(connection, pool.lpTokenMint),
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
      // Account not existing on-chain simply means the pool has not been initialized yet
      if (
        message.includes("Account does not exist") ||
        message.includes("could not find account") ||
        message.includes("has no data")
      ) {
        setError(null);
      } else {
        setError(message);
      }
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
