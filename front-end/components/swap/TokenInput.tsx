"use client";

import React, { useCallback } from "react";
import { formatTokenAmount } from "@/lib/solana/math";

interface TokenInputProps {
  label: string;
  symbol: string;
  value: string;
  onChange?: (value: string) => void;
  balance?: bigint;
  decimals: number;
  disabled?: boolean;
  readOnly?: boolean;
  showMax?: boolean;
  error?: string;
}

export function TokenInput({
  label,
  symbol,
  value,
  onChange,
  balance,
  decimals,
  disabled = false,
  readOnly = false,
  showMax = false,
  error,
}: TokenInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow empty string
      if (raw === "" || raw === ".") {
        onChange?.(raw);
        return;
      }

      // Validate: positive number with appropriate decimal places
      const regex = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`);
      if (regex.test(raw)) {
        onChange?.(raw);
      }
    },
    [onChange, decimals]
  );

  const handleMax = useCallback(() => {
    if (balance !== undefined && balance > 0n) {
      onChange?.(formatTokenAmount(balance, decimals));
    }
  }, [balance, decimals, onChange]);

  const formattedBalance =
    balance !== undefined ? formatTokenAmount(balance, decimals, 4) : null;

  const hasInsufficientBalance =
    balance !== undefined &&
    value !== "" &&
    value !== "." &&
    (() => {
      try {
        const parts = value.split(".");
        const whole = BigInt(parts[0] || "0");
        const frac = parts[1] ? BigInt(parts[1].padEnd(decimals, "0").slice(0, decimals)) : 0n;
        const raw = whole * 10n ** BigInt(decimals) + frac;
        return raw > balance;
      } catch {
        return false;
      }
    })();

  return (
    <div className={`token-input ${error || hasInsufficientBalance ? "!border-error/40" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {label}
        </label>
        {formattedBalance !== null && (
          <span className="text-xs text-text-muted">
            Balance:{" "}
            <span className={`font-medium ${hasInsufficientBalance ? "text-error" : "text-text-secondary"}`}>
              {formattedBalance}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          className={`flex-1 bg-transparent text-2xl font-semibold text-text-primary placeholder-text-dimmed outline-none ${
            readOnly ? "cursor-default" : ""
          } ${disabled ? "opacity-50" : ""}`}
          aria-label={`${label} amount`}
        />

        <div className="flex items-center gap-2 flex-shrink-0">
          {showMax && !readOnly && balance !== undefined && balance > 0n && (
            <button
              onClick={handleMax}
              className="px-2 py-1 rounded-md text-xs font-semibold text-accent-secondary bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors"
              aria-label="Set maximum amount"
            >
              MAX
            </button>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-subtle text-sm font-semibold text-text-primary">
            {symbol}
          </div>
        </div>
      </div>

      {(error || hasInsufficientBalance) && (
        <p className="mt-2 text-xs text-error">
          {error || "Insufficient balance"}
        </p>
      )}
    </div>
  );
}
