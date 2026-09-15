"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getTokenBalance } from "@/lib/solana/tokens";
import { STALE_DATA_MS } from "@/lib/solana/constants";

interface TokenBalances {
  sol: bigint;
  tokenA: bigint;
  tokenB: bigint;
  lp: bigint;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches the connected wallet's SOL and token balances.
 */
export function useTokenBalances(
  tokenAMint: PublicKey | null,
  tokenBMint: PublicKey | null,
  lpMint: PublicKey | null
): TokenBalances {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [sol, setSol] = useState<bigint>(0n);
  const [tokenA, setTokenA] = useState<bigint>(0n);
  const [tokenB, setTokenB] = useState<bigint>(0n);
  const [lp, setLp] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setSol(0n);
      setTokenA(0n);
      setTokenB(0n);
      setLp(0n);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const solBalance = await connection.getBalance(publicKey);
      setSol(BigInt(solBalance));

      const fetchPromises: Promise<bigint>[] = [];

      if (tokenAMint) {
        fetchPromises.push(getTokenBalance(connection, publicKey, tokenAMint));
      } else {
        fetchPromises.push(Promise.resolve(0n));
      }

      if (tokenBMint) {
        fetchPromises.push(getTokenBalance(connection, publicKey, tokenBMint));
      } else {
        fetchPromises.push(Promise.resolve(0n));
      }

      if (lpMint) {
        fetchPromises.push(getTokenBalance(connection, publicKey, lpMint));
      } else {
        fetchPromises.push(Promise.resolve(0n));
      }

      const [balA, balB, balLp] = await Promise.all(fetchPromises);
      setTokenA(balA);
      setTokenB(balB);
      setLp(balLp);

      lastFetchRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, tokenAMint, tokenBMint, lpMint]);

  useEffect(() => {
    // Fetch on mount (deferred to avoid synchronous setState in effect)
    queueMicrotask(() => refresh());

    // Refresh when tab becomes visible (if data is stale)
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchRef.current > STALE_DATA_MS
      ) {
        refresh();
      }
    };

    // Refresh on window focus (if data is stale)
    const handleFocus = () => {
      if (Date.now() - lastFetchRef.current > STALE_DATA_MS) {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  return { sol, tokenA, tokenB, lp, loading, error, refresh };
}

/**
 * Format SOL balance for display.
 */
export function formatSol(lamports: bigint): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return sol.toFixed(4);
}
