"use client";

import { useState } from "react";

interface AddressDisplayProps {
  address: string;
  label?: string;
  explorerUrl: string;
  truncate?: boolean;
}

export function AddressDisplay({
  address,
  label,
  explorerUrl,
  truncate = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayAddress = truncate
    ? `${address.slice(0, 6)}…${address.slice(-6)}`
    : address;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {label && (
        <span className="text-sm text-text-muted">{label}</span>
      )}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm text-text-secondary">{displayAddress}</span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-white/5 transition-colors text-text-dimmed hover:text-text-secondary"
          aria-label="Copy address"
          title="Copy address"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {/* Explorer link */}
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded hover:bg-white/5 transition-colors text-text-dimmed hover:text-accent-secondary"
          aria-label="View on Solana Explorer"
          title="View on Explorer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
