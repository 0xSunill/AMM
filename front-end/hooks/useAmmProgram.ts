"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "@/lib/solana/constants";
import idl from "@/idl/amm.json";

/**
 * Returns the Anchor Program instance for the AMM.
 * Returns null when no wallet is connected (read-only operations
 * should use the connection directly).
 */
export function useAmmProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  const readonlyProgram = useMemo(() => {
    // Create a read-only provider for fetching data without wallet
    const provider = new AnchorProvider(
      connection,
      // Dummy wallet for read-only operations
      {
        publicKey: PROGRAM_ID,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signAllTransactions: (txs: any) => txs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signTransaction: (tx: any) => tx,
      },
      { commitment: "confirmed" }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program(idl as any, provider);
  }, [connection]);

  return { program, readonlyProgram };
}
