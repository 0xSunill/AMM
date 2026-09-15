"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface FaucetButtonProps {
  onSuccess?: () => void;
}

export function FaucetButton({ onSuccess }: FaucetButtonProps) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleFaucet = useCallback(async () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      setIsError(false);

      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("✓ 1,000 TKA + 1,000 TKB received!");
        setIsError(false);
        onSuccess?.();
      } else {
        setMessage(data.message || "Faucet request failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error. Please try again.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [publicKey, setVisible, onSuccess]);

  return (
    <div className="relative">
      <button
        onClick={handleFaucet}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-cyan/10 border border-cyan/20 text-cyan hover:bg-cyan/20 hover:border-cyan/40 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Get free test tokens on Devnet"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Minting…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
            </svg>
            Get Test Tokens
          </>
        )}
      </button>

      {/* Toast message */}
      {message && (
        <div
          className={`absolute top-full right-0 mt-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap animate-fade-in shadow-lg shadow-black/20 z-50 ${
            isError
              ? "bg-error-bg border border-error/20 text-error"
              : "bg-success-bg border border-success/20 text-success"
          }`}
        >
          {message}
          <button
            onClick={() => setMessage(null)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
