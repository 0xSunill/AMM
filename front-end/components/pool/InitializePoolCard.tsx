"use client";

import { useCallback } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAmmProgram } from "@/hooks/useAmmProgram";
import { useTransactionState } from "@/hooks/useTransactionState";
import { getPoolPda, getVaultAPda, getVaultBPda, getLpMintPda } from "@/lib/solana/pda";
import { TOKEN_PROGRAM_ID, getExplorerUrl } from "@/lib/solana/constants";
import { TransactionStatus } from "../ui/TransactionStatus";
import { AddressDisplay } from "../ui/AddressDisplay";

interface InitializePoolCardProps {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  onSuccess?: () => void;
}

export function InitializePoolCard({
  tokenAMint,
  tokenBMint,
  tokenASymbol = "TKA",
  tokenBSymbol = "TKB",
  onSuccess,
}: InitializePoolCardProps) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useAmmProgram();
  const txState = useTransactionState();

  const handleInitialize = useCallback(async () => {
    if (!program || !publicKey) return;

    await txState.execute(async () => {
      const [poolAddress] = getPoolPda(tokenAMint, tokenBMint);
      const [vaultA] = getVaultAPda(tokenAMint, tokenBMint);
      const [vaultB] = getVaultBPda(tokenAMint, tokenBMint);
      const [lpMint] = getLpMintPda(tokenAMint, tokenBMint);

      const tx = await program.methods
        .initialize()
        .accounts({
          payer: publicKey,
          pool: poolAddress,
          vaultA,
          vaultB,
          lpMint,
          tokenAMint,
          tokenBMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      onSuccess?.();
      return tx;
    });
  }, [program, publicKey, tokenAMint, tokenBMint, txState, onSuccess]);

  const [poolAddress] = getPoolPda(tokenAMint, tokenBMint);

  return (
    <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in border-accent-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-secondary"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary">Pool Not Initialized</h2>
          <p className="text-xs text-text-muted">
            {tokenASymbol} / {tokenBSymbol} pool is ready to be created
          </p>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-4 leading-relaxed">
        This AMM pool account has not been initialized on Solana yet. Click below to initialize the pool, create the token vaults, and create the LP mint.
      </p>

      <div className="space-y-2 mb-5 p-3 rounded-xl bg-bg-primary/50 text-xs">
        <AddressDisplay
          label="Pool PDA"
          address={poolAddress.toBase58()}
          explorerUrl={getExplorerUrl(poolAddress.toBase58())}
        />
        <AddressDisplay
          label={tokenASymbol}
          address={tokenAMint.toBase58()}
          explorerUrl={getExplorerUrl(tokenAMint.toBase58())}
        />
        <AddressDisplay
          label={tokenBSymbol}
          address={tokenBMint.toBase58()}
          explorerUrl={getExplorerUrl(tokenBMint.toBase58())}
        />
      </div>

      <button
        onClick={publicKey ? handleInitialize : () => setVisible(true)}
        disabled={
          publicKey
            ? txState.state === "preparing" ||
              txState.state === "awaiting_approval" ||
              txState.state === "submitting" ||
              txState.state === "confirming"
            : false
        }
        className="btn-primary"
      >
        {!publicKey
          ? "Connect Wallet to Initialize"
          : txState.state === "preparing" || txState.state === "awaiting_approval"
          ? "Confirm in Wallet…"
          : txState.state === "submitting" || txState.state === "confirming"
          ? "Initializing Pool…"
          : "Initialize Pool"}
      </button>

      <TransactionStatus status={txState} onDismiss={txState.reset} />
    </div>
  );
}
