"use client";

import { getExplorerUrl } from "@/lib/solana/constants";
import type { TransactionStatus as TxStatus } from "@/types/amm";

interface TransactionStatusProps {
  status: TxStatus;
  onDismiss?: () => void;
}

export function TransactionStatus({ status, onDismiss }: TransactionStatusProps) {
  const { state, txSignature, errorMessage, errorDetails } = status;

  if (state === "idle") return null;

  return (
    <div className="mt-4 animate-fade-in">
      {/* Preparing / Awaiting Approval */}
      {(state === "preparing" || state === "awaiting_approval") && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-primary/5 border border-accent-primary/20">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent-primary border-t-transparent" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {state === "preparing" ? "Preparing transaction…" : "Awaiting wallet approval…"}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {state === "awaiting_approval" && "Please confirm in your wallet"}
            </p>
          </div>
        </div>
      )}

      {/* Submitting / Confirming */}
      {(state === "submitting" || state === "confirming") && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning-bg border border-warning/20">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-warning border-t-transparent" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {state === "submitting" ? "Submitting transaction…" : "Confirming transaction…"}
            </p>
            {txSignature && (
              <a
                href={getExplorerUrl(txSignature, "tx")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-secondary hover:underline mt-0.5 inline-flex items-center gap-1"
              >
                View on Explorer
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {state === "success" && (
        <div className="p-4 rounded-xl bg-success-bg border border-success/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-success">Transaction Confirmed</p>
                {txSignature && (
                  <a
                    href={getExplorerUrl(txSignature, "tx")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-secondary hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    {`${txSignature.slice(0, 8)}…${txSignature.slice(-8)}`}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
            {onDismiss && (
              <button onClick={onDismiss} className="text-text-dimmed hover:text-text-secondary p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="p-4 rounded-xl bg-error-bg border border-error/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-error">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-error">{errorMessage || "Transaction failed"}</p>
                {errorDetails && errorDetails !== errorMessage && (
                  <details className="mt-2">
                    <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
                      Technical details
                    </summary>
                    <pre className="mt-1.5 text-xs text-text-dimmed bg-bg-primary/50 p-2 rounded-lg overflow-x-auto max-w-full whitespace-pre-wrap break-all">
                      {errorDetails}
                    </pre>
                  </details>
                )}
              </div>
            </div>
            {onDismiss && (
              <button onClick={onDismiss} className="text-text-dimmed hover:text-text-secondary p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
